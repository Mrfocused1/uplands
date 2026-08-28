import { NextResponse } from "next/server";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { captureException } from "@/lib/observability";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const upstashLimiters = new Map<string, Ratelimit>();

function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${scope}:${forwarded || realIp || "unknown"}`;
}

function upstashConfigured() {
  return Boolean(env("UPSTASH_REDIS_REST_URL") && env("UPSTASH_REDIS_REST_TOKEN"));
}

function windowSeconds(windowMs: number) {
  return `${Math.max(1, Math.ceil(windowMs / 1000))} s` as Duration;
}

function getUpstashLimiter(input: { scope: string; limit: number; windowMs: number }) {
  const key = `${input.scope}:${input.limit}:${input.windowMs}`;
  const cached = upstashLimiters.get(key);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(input.limit, windowSeconds(input.windowMs)),
    analytics: env("UPSTASH_RATE_LIMIT_ANALYTICS", "false") === "true",
    prefix: `uplands:${input.scope}`,
    timeout: 750,
  });
  upstashLimiters.set(key, limiter);
  return limiter;
}

function localRateLimit(request: Request, input: { scope: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const key = clientKey(request, input.scope);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + input.windowMs });
    return null;
  }

  current.count += 1;
  if (current.count <= input.limit) return null;

  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))),
      },
    },
  );
}

export async function rateLimit(request: Request, input: { scope: string; limit: number; windowMs: number }) {
  const key = clientKey(request, input.scope);

  if (upstashConfigured()) {
    try {
      const result = await getUpstashLimiter(input).limit(key);
      if (result.success) return null;

      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
          },
        },
      );
    } catch (error) {
      captureException(error, {
        tags: { area: "rate-limit", provider: "upstash", scope: input.scope },
        extra: { limit: input.limit, windowMs: input.windowMs },
      });
    }
  }

  return localRateLimit(request, input);
}
