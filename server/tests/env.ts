export const billingEnabled = true;
export const env = {
 jwtSecret: 'test-secret-at-least-32-chars-long-xxxxx', isProduction: false, // gitleaks:allow (fake test value)
 appUrl: 'http://localhost', corsOrigins: [], trustProxy: false,
 aiProvider: 'anthropic' as 'anthropic' | 'openai' | 'xai', aiModel: 'test-model', anthropicKey: 'test-key', openaiKey: 'test-key', xaiKey: 'test-key',
 stripeSecret: 'sk_test_fake', stripePriceId: 'price_fake', stripeWebhookSecret: 'whsec_fake',
 freeMonthlyLimit: 2, freeDailyLimit: 2, proMonthlyLimit: 5, proDailyLimit: 3,
 authRateLimitPerMinute: 10, aiRateLimitPerMinute: 20, aiIpRateLimitPerMinute: 0,
};
