process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1/test";
process.env.JWT_SECRET = "test-access-secret-000000000";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-00000000";
process.env.JWT_ACCESS_TTL = "15m";
process.env.RAZORPAY_KEY_SECRET = "checkout_secret_test";   // enables signature verify
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
// RAZORPAY_KEY_ID intentionally unset → payment orders use the local stub (no network).
