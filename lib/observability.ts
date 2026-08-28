import * as Sentry from "@sentry/nextjs";

export function captureException(error: unknown, context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }) {
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context?.tags ?? {})) scope.setTag(key, value);
    for (const [key, value] of Object.entries(context?.extra ?? {})) scope.setExtra(key, value);
    Sentry.captureException(error);
  });
}
