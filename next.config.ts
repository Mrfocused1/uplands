import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["better-sqlite3", "sharp"],
  outputFileTracingIncludes: {
    "/api/admin/edit-images/**/*": ["./private/edit-images/**/*"],
  },
};

const sentryConfigured = Boolean(
  process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    (process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT),
);

export default sentryConfigured
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      disableLogger: true,
    })
  : nextConfig;
