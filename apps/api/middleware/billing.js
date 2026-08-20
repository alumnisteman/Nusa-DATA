// middleware/billing.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple API‑Key auth – in production replace with proper auth
async function billingMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  // Find active subscription linked to this key (for demo we store key in Subscription.id)
  const subscription = await prisma.subscription.findUnique({ where: { id: apiKey } });
  if (!subscription || subscription.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Invalid or inactive subscription' });
  }
  // Record usage
  await prisma.apiUsage.create({
    data: {
      subscriptionId: subscription.id,
      endpoint: req.path,
      method: req.method,
    },
  });
  // Attach subscription to request for downstream handlers if needed
  req.subscription = subscription;
  next();
}

module.exports = billingMiddleware;
