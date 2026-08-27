const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ledgerService = require('../services/ledgerService');

/**
 * Simulasi pembuatan URL checkout untuk invoice.
 * Pada fase produksi, ganti dengan integrasi nyata Midtrans / Stripe.
 *
 * @param {string} invoiceId - ID invoice di database.
 * @returns {Promise<string>} URL checkout yang dapat di‑redirect user.
 */
async function createCheckoutUrl(invoiceId) {
  // Cari invoice, pastikan ada
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Generate external ID yang unik (mock)
  const externalId = `MOCK-${invoiceId.slice(0, 8)}-${Date.now()}`;
  // URL mock – pada dev gunakan endpoint lokal yang akan men‑simulasi pembayaran
  const baseUrl = process.env.PAYMENT_GATEWAY_URL || 'http://localhost:3001';
  const checkoutUrl = `${baseUrl}/api/payment/mock-pay/${externalId}`;

  // Simpan record payment dengan status PENDING
  await prisma.payment.create({
    data: {
      invoiceId,
      externalId,
      checkoutUrl,
      status: 'PENDING',
      // expiry 24 jam
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return checkoutUrl;
}

/**
 * Convenience wrapper used by the newer checkout endpoint.
 * Accepts a full invoice object, extracts the id, and returns the checkout URL.
 *
 * @param {object} invoice - Prisma invoice record.
 * @returns {Promise<object>} Object containing the generated checkoutUrl.
 */
async function createCheckout(invoice) {
  const checkoutUrl = await createCheckoutUrl(invoice.id);
  return { checkoutUrl };
}

/**
 * Menangani webhook notifikasi dari gateway pembayaran (mock atau nyata).
 * Payload yang di‑expect minimal memiliki `externalId` dan `status`.
 *
 * @param {object} payload - Body webhook dari provider.
 * @returns {Promise<object>} Hasil proses, berisi status & invoiceId.
 */
async function handleWebhook(payload) {
  const { externalId, status } = payload;
  if (!externalId || !status) {
    throw new Error('Invalid webhook payload');
  }

  // Update payment record
  await prisma.payment.updateMany({
    where: { externalId },
    data: { status },
  });

  // Cari invoice terkait (jika ada)
  const paymentRecord = await prisma.payment.findFirst({ where: { externalId } });
  const invoiceId = paymentRecord?.invoiceId || null;

  // Jika pembayaran berhasil, tandai invoice PAID
  if (status === 'SUCCESS' && invoiceId) {
    // Update payment record dengan status dan paidAt
    await prisma.payment.updateMany({
      where: { externalId },
      data: { status: 'SUCCESS', paidAt: new Date() }
    });

    // Tandai invoice PAID
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });
    // Dapatkan detail invoice untuk mencatat revenue platform
    const paidInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (paidInvoice) {
      await ledgerService.recordPlatformRevenue({
        paymentId: paymentRecord?.id,
        amountCents: paidInvoice.totalCents,
        currency: 'IDR',
        description: 'Pendapatan Premium/B2B dibayar',
      });
    }
  }

  return { externalId, status, invoiceId };
}

module.exports = {
  createCheckoutUrl,
  createCheckout,
  handleWebhook,
};
