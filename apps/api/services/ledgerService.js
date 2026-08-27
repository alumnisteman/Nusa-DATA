const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * ============================================================
 * NUSA-DATA Ledger Service (Double-Entry Bookkeeping)
 * Mengelola pembagian komisi, revenue platform, dan dompet pekerja.
 * ============================================================
 */

// 1. Catat Pemasukan Murni (Premium / B2B) -> 100% ke Platform
async function recordPlatformRevenue({ paymentId, amountCents, currency, description }) {
  // Debit: Customer Payment
  await prisma.ledgerEntry.create({
    data: {
      paymentId,
      account: 'CUSTOMER_PAYMENT',
      type: 'DEBIT',
      amountCents,
      currency,
      description: description || 'Pembayaran Premium/B2B masuk'
    }
  });

  // Credit: Platform Revenue
  await prisma.ledgerEntry.create({
    data: {
      paymentId,
      account: 'PLATFORM_REVENUE',
      type: 'CREDIT',
      amountCents,
      currency,
      description: description || 'Pendapatan Premium/B2B dicatat'
    }
  });
}

// 2. Catat Pembagian Komisi (Marketplace / AI Task)
// Contoh: Marketplace Task selesai, dari uang yang ditahan (Escrow),
// pecah 10-30% untuk platform fee, sisanya ke Worker Wallet.
async function recordCommissionSplit({ referenceId, totalCents, platformFeePercentage, workerId, currency = 'IDR', description }) {
  const platformFeeCents = Math.round(totalCents * (platformFeePercentage / 100));
  const workerCents = totalCents - platformFeeCents;

  // Credit 1: Platform Revenue (total amount first)
  await prisma.ledgerEntry.create({
    data: {
      account: 'PLATFORM_REVENUE',
      type: 'CREDIT',
      amountCents: totalCents,
      currency,
      referenceId,
      description: description || 'Total pendapatan dari marketplace/AI task'
    }
  });

  // Debit 1: Customer Payment (debit full amount)
  await prisma.ledgerEntry.create({
    data: {
      account: 'CUSTOMER_PAYMENT',
      type: 'DEBIT',
      amountCents: totalCents,
      currency,
      referenceId,
      description: 'Pembayaran diterima untuk marketplace/AI task'
    }
  });

  // Credit 2: Worker Wallet (worker share)
  if (workerCents > 0) {
    await prisma.ledgerEntry.create({
      data: {
        account: 'WORKER_WALLET',
        type: 'CREDIT',
        amountCents: workerCents,
        currency,
        referenceId,
        description: description ? `${description} (Porsi Pekerja)` : 'Kredit ke dompet pekerja'
      }
    });
  }

  // Debit 2: Platform Fee (deduct platform fee from revenue)
  if (platformFeeCents > 0) {
    await prisma.ledgerEntry.create({
      data: {
        account: 'PLATFORM_FEE',
        type: 'DEBIT',
        amountCents: platformFeeCents,
        currency,
        referenceId,
        description: description ? `${description} (Komisi Platform)` : 'Komisi platform'
      }
    });
  }
}

// 3. Ambil Laporan Keuangan (Untuk Dasbor Owner)
async function getRevenueReport() {
  // Ambil semua entry ledger
  const entries = await prisma.ledgerEntry.findMany();

  let totalPlatformRevenueCents = 0;
  let totalPlatformFeeCents = 0;
  let totalWorkerPayoutCents = 0;

  entries.forEach(entry => {
    if (entry.account === 'PLATFORM_REVENUE' && entry.type === 'CREDIT') {
      totalPlatformRevenueCents += entry.amountCents;
    }
    if (entry.account === 'PLATFORM_FEE' && entry.type === 'DEBIT') {
      totalPlatformFeeCents += entry.amountCents;
    }
    if (entry.account === 'WORKER_WALLET' && entry.type === 'CREDIT') {
      totalWorkerPayoutCents += entry.amountCents;
    }
  });

  // Net revenue = total revenue - platform fees
  const totalNetRevenueCents = totalPlatformRevenueCents - totalPlatformFeeCents;

  return {
    mrrCents: totalPlatformRevenueCents,          // Premium & B2B
    commissionCents: totalPlatformFeeCents,       // Marketplace & AI Task Margin
    workerPayoutCents: totalWorkerPayoutCents,
    totalNetRevenueCents: totalNetRevenueCents,
    // Alias fields for UI convenience
    mrr: totalPlatformRevenueCents,
    commission: totalPlatformFeeCents,
    workerPayout: totalWorkerPayoutCents,
    totalNetRevenue: totalNetRevenueCents
  };
}

async function getRevenueChart() {
  // Aggregate monthly revenue data for chart visualization
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { account: 'PLATFORM_REVENUE', type: 'CREDIT' },
        { account: 'PLATFORM_FEE', type: 'DEBIT' },
        { account: 'WORKER_WALLET', type: 'CREDIT' }
      ]
    }
  });

  const monthlyMap = {};
  for (const e of entries) {
    const monthKey = e.createdAt.toISOString().slice(0, 7); // "YYYY-MM"
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { mrrCents: 0, commissionCents: 0, workerPayoutCents: 0 };
    }
    if (e.account === 'PLATFORM_REVENUE' && e.type === 'CREDIT') {
      monthlyMap[monthKey].mrrCents += e.amountCents;
    } else if (e.account === 'PLATFORM_FEE' && e.type === 'DEBIT') {
      monthlyMap[monthKey].commissionCents += e.amountCents;
    } else if (e.account === 'WORKER_WALLET' && e.type === 'CREDIT') {
      monthlyMap[monthKey].workerPayoutCents += e.amountCents;
    }
  }

  const result = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, vals]) => {
      const date = new Date(key + '-01');
      const monthLabel = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      return { month: monthLabel, ...vals };
    });

  return result;
}

module.exports = {
  recordPlatformRevenue,
  recordCommissionSplit,
  getRevenueReport,
  getRevenueChart
};
