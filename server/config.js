// Central config, read from environment variables (see .env.example).
const env = process.env;

export const config = {
  port: Number(env.PORT || 8787),
  host: env.HOST || "0.0.0.0",
  // Folder where PGlite keeps the Postgres data files. "memory://" for an in-memory DB.
  dataDir: env.DATA_DIR || "./data/pg",
  // Demo mode: OTP codes are returned in the API response, seeded Taskers auto-reply
  // in chat, and clients may advance booking status themselves. Turn off in production.
  demo: env.DEMO_MODE !== "false",
  sessionDays: Number(env.SESSION_DAYS || 30),
  otpTtlMinutes: 10,
  otpResendSeconds: 30,
  feeRate: 0.07,
  lrdRate: Number(env.LRD_RATE || 190),
  sms: {
    provider: env.SMS_PROVIDER || "console", // console | africastalking
    atUsername: env.AT_USERNAME,
    atApiKey: env.AT_API_KEY,
    atSenderId: env.AT_SENDER_ID,
  },
  payments: {
    // "sandbox" marks mobile-money payments as succeeded immediately.
    // Set to "live" once Orange Money / MTN MoMo merchant credentials are configured.
    mode: env.PAYMENTS_MODE || "sandbox",
    orange: { clientId: env.ORANGE_CLIENT_ID, clientSecret: env.ORANGE_CLIENT_SECRET, merchantKey: env.ORANGE_MERCHANT_KEY },
    mtn: { subscriptionKey: env.MTN_SUBSCRIPTION_KEY, apiUser: env.MTN_API_USER, apiKey: env.MTN_API_KEY, targetEnv: env.MTN_TARGET_ENV || "sandbox" },
  },
  corsOrigin: env.CORS_ORIGIN || true,
};
