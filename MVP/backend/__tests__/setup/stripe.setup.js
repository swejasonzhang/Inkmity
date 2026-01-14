if (process.env.NODE_ENV === "test" || !process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_key_for_testing";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret";
}