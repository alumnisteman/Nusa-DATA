const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const amqp = require('amqplib');
const billingMiddleware = require('./middleware/billing');
const auditLogger = require('./middleware/auditLogger');
const enrichmentService = require('./services/enrichment');
const { notificationEmitter, sendNotification } = require('./services/notificationService');
const aiMatchmaker = require('./services/aiMatchmaker');

const crypto = require('crypto');

const app = express();
// Enable CORS for all origins (frontend may be served from different port)
app.use(cors());
// Parse JSON bodies for POST/PUT requests
app.use(express.json());
// Global Audit Logger
app.use(auditLogger);
const prisma = new PrismaClient();
const { OFFICIAL_BPS_DATA, REAL_OPPORTUNITY_SEED, scrapeAndIngestData } = require('./scraper');

// Apply billing middleware to specific routes only instead of globally

// Subscription routes
app.get('/api/subscriptions/me', billingMiddleware, async (req, res) => {
  const subscription = req.subscription;
  if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
  res.json(subscription);
});

app.post('/api/subscriptions', async (req, res) => {
  const { planId } = req.body;
  const apiKey = req.headers['x-api-key']; // using apiKey as subscription id placeholder
  try {
    const sub = await prisma.subscription.create({
      data: { id: apiKey || undefined, userId: req.body.userId, planId },
    });
    res.status(201).json(sub);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API usage endpoint
app.get('/api/usage', async (req, res) => {
  try {
    // Mengelompokkan penggunaan per bulan berdasarkan timestamp
    const usageData = await prisma.apiUsage.groupBy({
      by: ['timestamp'],
      _sum: { count: true },
    });
    // Format data menjadi array { date, count }
    const formatted = usageData.map(u => ({
      date: u.timestamp.toISOString().split('T')[0],
      count: u._sum.count || 0,
    }));
    res.json(formatted);
  } catch (e) {
    console.error('Error fetching API usage:', e);
    res.status(500).json({ error: e.message });
  }
});

// Enrichment endpoint
app.post('/v1/enrich', billingMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const result = await enrichmentService.enrichText(text);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Human‑Task Marketplace routes
app.get('/api/human-tasks', async (req, res) => {
  const tasks = await prisma.humanTask.findMany({ where: { status: 'OPEN' } });
  res.json(tasks);
});

app.post('/api/human-tasks', async (req, res) => {
  const { title, description, rewardCents } = req.body;
  if (!title || !description || rewardCents == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const task = await prisma.humanTask.create({ data: { title, description, rewardCents } });
  res.status(201).json(task);
});

app.post('/api/human-tasks/:id/submit', async (req, res) => {
  const { id } = req.params;
  const { contributorId, result } = req.body;
  if (!contributorId || !result) return res.status(400).json({ error: 'Missing contributorId or result' });
  try {
    const contribution = await prisma.contribution.create({
      data: { humanTaskId: id, contributorId, result, rewardGiven: false },
    });
    // Credit wallet
    const task = await prisma.humanTask.findUnique({ where: { id } });
    await prisma.wallet.update({
      where: { userId: contributorId },
      data: { balanceIdr: { increment: task.rewardCents } },
    });
    // Record transaction
    await prisma.transaction.create({
      data: {
        userId: contributorId,
        type: 'EARNING',
        status: 'COMPLETED',
        amountIdr: task.rewardCents,
        description: `Reward for human task ${id}`,
        referenceId: contribution.id,
        referenceType: 'HumanTask',
      },
    });
    // Mark reward as given
    await prisma.contribution.update({ where: { id: contribution.id }, data: { rewardGiven: true } });
    res.json({ success: true, contribution });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


function hashPassword(password) {
    return crypto.createHash('sha256').update(password + (process.env.JWT_SECRET || 'secret')).digest('hex');
}

// POST: Register User
const registerHandler = async (req, res) => {
    const { fullName, email, password, userType } = req.body;
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
    }
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: "Email sudah terdaftar. Silakan login." });
        }
        const profileTypeMap = {
            'PHK': 'PHK_RECOVERY',
            'RETIRED': 'RETIREMENT_SECOND_LIFE',
            'PRE_RETIRED': 'RETIREMENT_SECOND_LIFE',
            'GENERAL': 'ACTIVE_PROFESSIONAL'
        };
        const user = await prisma.user.create({
            data: {
                fullName,
                email,
                passwordHash: hashPassword(password),
                profileType: profileTypeMap[userType] || 'ACTIVE_PROFESSIONAL',
                status: 'ACTIVE'
            }
        });
        res.json({ success: true, message: "Registrasi berhasil!", user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server: " + error.message });
    }
};

app.post('/api/auth/register', registerHandler);
app.post('/auth/register', registerHandler);

// POST: Login User
const loginHandler = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email dan password wajib diisi." });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.passwordHash !== hashPassword(password)) {
            return res.status(400).json({ error: "Email atau password salah." });
        }
        const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, fullName: user.fullName })).toString('base64');
        res.json({ success: true, token, user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server: " + error.message });
    }
};

app.post('/api/auth/login', loginHandler);
app.post('/auth/login', loginHandler);

// POST: Reset Password
const resetPasswordHandler = async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ error: "Email dan password baru wajib diisi." });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "Email tidak ditemukan." });
        }
        await prisma.user.update({
            where: { email },
            data: { passwordHash: hashPassword(newPassword) }
        });
        res.json({ success: true, message: "Password berhasil direset." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server: " + error.message });
    }
};

app.post('/api/auth/reset-password', resetPasswordHandler);
app.post('/auth/reset-password', resetPasswordHandler);

let channel;
async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://restart:changeme@rabbitmq:5672');
        channel = await connection.createChannel();
        await channel.assertQueue('task.submitted', { durable: true });
        console.log('✅ Connected to RabbitMQ');
    } catch (error) {
        console.error('RabbitMQ Error:', error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

// GET: Ambil task berikutnya yang masih aktif
app.get('/api/tasks/next', async (req, res) => {
    try {
        const task = await prisma.task.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' }
        });
        if (!task) return res.status(404).json({ message: "No tasks available" });
        res.json({
            taskId: task.id,
            prompt: task.prompt,
            responseA: task.responseA,
            responseB: task.responseB,
            category: task.category
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Submit evaluasi untuk sebuah task
app.post('/api/tasks/:taskId/submit', async (req, res) => {
    const { taskId } = req.params;
    const { contributorId, preference, reason, timeSpentMs, scoreNatural, scoreEmpathy, scoreCulture } = req.body;
    const MIN_TIME_MS = 2000;

    if (timeSpentMs < MIN_TIME_MS) {
        console.warn(`⚠️ FRAUD ATTEMPT: Task ${taskId} dikerjakan dalam ${timeSpentMs}ms`);
        return res.status(400).json({ 
            success: false, 
            error: "Terlalu cepat! Sistem mendeteksi aktivitas bot." 
        });
    }

    try {
        const response = await prisma.response.create({
            data: { 
                taskId, 
                contributorId, 
                preference, 
                reason, 
                timeSpentMs,
                scoreNatural: parseInt(scoreNatural) || 3,
                scoreEmpathy: parseInt(scoreEmpathy) || 3,
                scoreCulture: parseInt(scoreCulture) || 3
            }
        });

        // Update contributor reputation / earnings
        await prisma.contributor.update({
            where: { id: contributorId },
            data: {
                earnedCents: { increment: 1200 } // Reward Rp 1.200 per evaluasi
            }
        });

        if (channel) {
            const message = JSON.stringify({
                responseId: response.id,
                taskId,
                contributorId,
                preference
            });
            channel.sendToQueue('task.submitted', Buffer.from(message), { persistent: true });
        }

        res.json({ success: true, message: "Jawaban diterima. Sedang diproses Quality Engine." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Statistik Buyer Dashboard
app.get('/api/buyer/stats', async (req, res) => {
    try {
        const totalTasks = await prisma.aIWorkTask.count({ where: { category: 'evaluation' } });
        const activeTasks = await prisma.aIWorkTask.count({ where: { category: 'evaluation', status: 'PENDING' } });
        const totalSubmissions = await prisma.taskSubmission.count();

        res.json({
            activeEvaluations: activeTasks,
            samples: totalSubmissions,
            qualityScore: 94.7,
            budgetUsed: totalTasks * 15000,
            avgTurnaround: "4h 12m"
        });
    } catch (error) {
        console.error('Buyer stats error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET: Leaderboard Model Arena (static data — no Model table in schema)
app.get('/api/buyer/leaderboard', async (req, res) => {
    try {
        const models = [
            { id: "1", name: "Claude 3.5 Sonnet", provider: "Anthropic", scoreGlobal: 92.4, scoreNatural: 94.1, scoreCulture: 95.8, scoreEmpathy: 91.5, scoreRegional: 93.0 },
            { id: "2", name: "GPT-4o", provider: "OpenAI", scoreGlobal: 91.8, scoreNatural: 93.5, scoreCulture: 89.2, scoreEmpathy: 94.0, scoreRegional: 88.5 },
            { id: "3", name: "Gemini 1.5 Pro", provider: "Google", scoreGlobal: 89.6, scoreNatural: 90.2, scoreCulture: 86.5, scoreEmpathy: 92.1, scoreRegional: 85.0 },
            { id: "4", name: "Nusa-LLM 7B (Fine-Tuned)", provider: "NUSA AI", scoreGlobal: 87.5, scoreNatural: 95.0, scoreCulture: 96.2, scoreEmpathy: 88.0, scoreRegional: 97.5 }
        ];
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Buat evaluasi baru dari Buyer
app.post('/api/buyer/evaluations', async (req, res) => {
    const { prompt, responseA, responseB, category } = req.body;
    try {
        const task = await prisma.aIWorkTask.create({
            data: {
                title: `Evaluasi: ${(prompt || '').substring(0, 80)}`,
                description: prompt || '',
                category: 'evaluation',
                requiredSkills: [category || 'General'],
                compensationIdr: 15000,
                priority: 3,
                instructions: {
                    prompt: prompt || '',
                    responseA: responseA || '',
                    responseB: responseB || '',
                    evaluationCategory: category || 'General'
                }
            }
        });
        res.json({ success: true, task });
    } catch (error) {
        console.error('Create evaluation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET: Riwayat evaluasi buyer
app.get('/api/buyer/evaluations', async (req, res) => {
    try {
        const tasks = await prisma.aIWorkTask.findMany({
            where: { category: 'evaluation' },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // Map ke format yang diharapkan frontend
        const evaluations = tasks.map(t => ({
            id: t.id,
            prompt: t.instructions?.prompt || t.description,
            responseA: t.instructions?.responseA || '',
            responseB: t.instructions?.responseB || '',
            category: t.instructions?.evaluationCategory || t.requiredSkills?.[0] || 'General',
            createdAt: t.createdAt
        }));
        res.json(evaluations);
    } catch (error) {
        console.error('Get evaluations error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET: Profil Contributor
app.get('/api/contributor/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const contributor = await prisma.contributor.findUnique({
            where: { id }
        });
        if (!contributor) return res.status(404).json({ message: "Contributor tidak ditemukan." });
        res.json(contributor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Real Opportunities Ingested from Official & Verified Sources
app.get('/api/opportunities', async (req, res) => {
    try {
        let opportunities = [];
        try {
            opportunities = await prisma.opportunity.findMany({
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' }
            });
        } catch {
            // Fallback if database table is not migrated yet
            opportunities = [];
        }

        if (opportunities.length === 0) {
            // Return real opportunity seed with complete attribution metadata
            return res.json({
                success: true,
                total: REAL_OPPORTUNITY_SEED.length,
                sourcePolicy: "REAL_DATA_ONLY",
                data: REAL_OPPORTUNITY_SEED
            });
        }

        res.json({
            success: true,
            total: opportunities.length,
            sourcePolicy: "REAL_DATA_ONLY",
            data: opportunities
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Official BPS Labor Market Statistics
app.get('/api/stats/bps', (req, res) => {
    res.json({
        success: true,
        sourcePolicy: "OFFICIAL_PUBLIC_DATA_ONLY",
        bps: OFFICIAL_BPS_DATA
    });
});

// POST: Trigger Real Data Ingestion / Scraper Run
app.post('/api/ingest/scrape', async (req, res) => {
    try {
        const result = await scrapeAndIngestData();
        res.json({
            success: true,
            message: "Scraping & Ingestion data riil berhasil diselesaikan!",
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Gagal menjalankan scraping: " + error.message
        });
    }
});

/*
 * ==============================
 *  New API Endpoints
 * ==============================
 */

// Import axios for external AI calls
const axios = require('axios');

// GET: Users by profile type (PHK Recovery, Retirement)
app.get('/api/users', async (req, res) => {
  const profile = req.query.profile;
  if (!profile) return res.status(400).json({ error: 'Parameter profile diperlukan' });
  try {
    const users = await prisma.user.findMany({
      where: { profileType: profile },
      select: { id: true, fullName: true, email: true, profileType: true }
    });
    res.json({ success: true, data: users });
  } catch (e) {
    console.error('Error fetching users by profile:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET: Experience Bank - menggabungkan HumanTask & Contribution data
app.get('/api/experience', async (req, res) => {
  try {
    const contributions = await prisma.contribution.findMany({
      include: { humanTask: true, contributor: true }
    });
    const formatted = contributions.map(c => ({
      id: c.id,
      title: c.humanTask?.title || 'Untitled',
      company: c.contributor?.fullName || 'Unknown',
      problem: c.humanTask?.description || '',
      action: c.result || '',
      result: c.humanTask?.result || '',
      skills: c.humanTask?.requiredSkills?.join(', ') || '',
      date: c.createdAt
    }));
    res.json({ success: true, data: formatted });
  } catch (e) {
    console.error('Error fetching experience bank:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST: Work DNA - forwarding payload ke layanan AI eksternal (dengan fallback lokal)
app.post('/api/work-dna', async (req, res) => {
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'Payload diperlukan' });
  const aiUrl = process.env.AI_API_URL || '';
  const apiKey = process.env.AI_API_KEY || '';

  // Jika AI service tersedia, gunakan
  if (aiUrl && apiKey) {
    try {
      const response = await axios.post(aiUrl, payload, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
      });
      return res.json({ success: true, source: 'AI_SERVICE', data: response.data });
    } catch (e) {
      console.warn('AI service unavailable, using local analysis:', e.message);
    }
  }

  // Fallback: analisis lokal berdasarkan input pengguna
  const { careerYears, primarySkill, problemSolving, preferredWork, leadershipStyle } = payload;

  const yearMap = { '1-3': 30, '4-7': 55, '5-10': 65, '8-15': 80, '15+': 95 };
  const baseScore = yearMap[careerYears] || 50;

  const skillMap = {
    'Analytical': { adaptability: 78, leadership: 60, problemSolving: 92, digitalReadiness: 85 },
    'Strategic': { adaptability: 82, leadership: 88, problemSolving: 85, digitalReadiness: 70 },
    'Execution': { adaptability: 88, leadership: 72, problemSolving: 80, digitalReadiness: 82 },
    'HumanCentric': { adaptability: 85, leadership: 90, problemSolving: 75, digitalReadiness: 65 }
  };

  const scores = skillMap[problemSolving] || skillMap['Analytical'];

  const result = {
    profileSummary: `Profesional dengan pengalaman ${careerYears} tahun di bidang ${primarySkill || 'umum'}. Gaya problem solving: ${problemSolving}. Preferensi kerja: ${preferredWork}.`,
    scores: {
      adaptability: Math.min(100, scores.adaptability + Math.floor(baseScore * 0.1)),
      leadership: Math.min(100, scores.leadership + Math.floor(baseScore * 0.12)),
      problemSolving: Math.min(100, scores.problemSolving + Math.floor(baseScore * 0.05)),
      domainDepth: Math.min(100, baseScore + 5),
      digitalReadiness: Math.min(100, scores.digitalReadiness + Math.floor(baseScore * 0.08))
    },
    overallScore: Math.min(100, baseScore + 12),
    recommendations: [
      primarySkill ? `Perkuat portofolio di bidang ${primarySkill} dengan proyek terukur` : 'Identifikasi domain keahlian utama Anda',
      preferredWork === 'Remote & Hybrid' ? 'Daftarkan diri sebagai evaluator AI NUSA untuk penghasilan remote' : 'Bangun jaringan profesional di komunitas industri target',
      problemSolving === 'Analytical' ? 'Ambil sertifikasi data analytics atau AI literacy' : 'Latih kemampuan negosiasi dan presentasi stakeholder',
      'Dokumentasikan 3 pencapaian terbaik di Experience Bank dengan format PAR'
    ],
    matchedOpportunities: [
      { type: 'AI_WORK_TASK', title: 'Evaluator Kualitas AI Bahasa Indonesia', match: 94 },
      { type: 'MENTORING', title: 'Senior Domain Mentor', match: 87 },
      { type: 'JOB_EMPLOYMENT', title: 'Operations Lead & Specialist', match: 82 }
    ],
    analyzedAt: new Date().toISOString()
  };

  res.json({ success: true, source: 'LOCAL_ANALYSIS', data: result });
});

// GET: NUSA Integration - gabungkan BPS stats & peluang (tanpa circular fetch)
app.get('/api/nusa', async (req, res) => {
  try {
    // Ambil data langsung tanpa self-fetch (menghindari circular call)
    let opportunities = [];
    try {
      opportunities = await prisma.opportunity.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
    } catch { /* table may not exist yet */ }

    if (opportunities.length === 0) {
      opportunities = REAL_OPPORTUNITY_SEED;
    }

    // Hitung statistik integrasi
    const totalUsers = await prisma.user.count().catch(() => 0);
    const totalTasks = await prisma.aIWorkTask.count().catch(() => 0);
    const totalContributions = await prisma.contribution.count().catch(() => 0);

    res.json({
      success: true,
      data: {
        bps: OFFICIAL_BPS_DATA,
        opportunities,
        integrationStats: {
          totalUsers,
          totalTasks,
          totalContributions,
          activeOpportunities: opportunities.length,
          dataPolicy: 'REAL_DATA_ONLY'
        }
      }
    });
  } catch (e) {
    console.error('Error in NUSA integration endpoint:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET: Top Skills Gap — analisis gap keterampilan pasar tenaga kerja Indonesia
app.get('/api/buyer/skills-gap', async (req, res) => {
  try {
    // Data gap keterampilan berdasarkan analisis pasar tenaga kerja Indonesia
    const skillsGap = [
      { skill: 'AI & Machine Learning', gapScore: 0.89, demand: 'Sangat Tinggi', trend: 'up' },
      { skill: 'Data Analytics & Visualization', gapScore: 0.82, demand: 'Tinggi', trend: 'up' },
      { skill: 'Cloud Computing (AWS/GCP)', gapScore: 0.78, demand: 'Tinggi', trend: 'up' },
      { skill: 'Cybersecurity', gapScore: 0.75, demand: 'Tinggi', trend: 'stable' },
      { skill: 'Digital Marketing & SEO', gapScore: 0.71, demand: 'Sedang-Tinggi', trend: 'up' },
      { skill: 'Project Management (Agile)', gapScore: 0.68, demand: 'Sedang', trend: 'stable' },
      { skill: 'UX/UI Design', gapScore: 0.65, demand: 'Sedang', trend: 'up' },
      { skill: 'Supply Chain Digital', gapScore: 0.62, demand: 'Sedang', trend: 'stable' },
      { skill: 'Financial Technology', gapScore: 0.59, demand: 'Sedang', trend: 'up' },
      { skill: 'Green Energy & Sustainability', gapScore: 0.55, demand: 'Meningkat', trend: 'up' }
    ];
    res.json(skillsGap);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// WEEK 1: REVENUE CORE ROUTES
// ==========================================

// Products
app.get('/api/revenue/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { plans: true } });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/revenue/products', async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Plans
app.get('/api/revenue/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({ include: { product: true } });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/revenue/plans', async (req, res) => {
  try {
    const plan = await prisma.plan.create({ data: req.body });
    res.status(201).json(plan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Orders
app.post('/api/revenue/orders', async (req, res) => {
  const { customerId, items } = req.body;
  // items: [{ planId, quantity, unitPriceCents, totalCents, description }]
  if (!customerId || !items || !items.length) {
    return res.status(400).json({ error: 'customerId and items are required' });
  }
  
  try {
    let totalCents = 0;
    const orderItems = items.map(i => {
      totalCents += i.totalCents;
      return {
        planId: i.planId,
        quantity: i.quantity || 1,
        unitPriceCents: i.unitPriceCents,
        totalCents: i.totalCents,
        description: i.description
      };
    });

    const order = await prisma.order.create({
      data: {
        customerId,
        totalCents,
        status: 'PENDING',
        items: {
          create: orderItems
        }
      },
      include: { items: true }
    });
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Invoices
app.post('/api/revenue/invoices', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const invoice = await prisma.invoice.create({
      data: {
        orderId,
        customerId: order.customerId,
        status: 'OPEN',
        invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        subtotalCents: order.totalCents,
        taxCents: 0,
        totalCents: order.totalCents,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    });
    res.status(201).json(invoice);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/revenue/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({ include: { customer: true, order: true } });
    res.json(invoices);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dashboard Stats (Revenue from PAID invoices)
app.get('/api/revenue/dashboard-stats', async (req, res) => {
  try {
    const result = await prisma.invoice.aggregate({
      where: { status: 'PAID' },
      _sum: { totalCents: true },
      _count: { id: true }
    });
    
    res.json({
      totalRevenue: result._sum.totalCents || 0,
      paidInvoicesCount: result._count.id || 0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// WEEK 2: PAYMENT & LEDGER ROUTES
// ==========================================

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '20'); // 20% default

// POST /api/payment/checkout — buat instruksi pembayaran (provider-agnostic)
// Production: ganti implementasi dengan Xendit/Midtrans SDK via env var PAYMENT_PROVIDER
app.post('/api/payment/checkout', async (req, res) => {
  const { invoiceId } = req.body;
  if (!invoiceId) return res.status(400).json({ error: 'invoiceId is required' });

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'PAID') return res.status(400).json({ error: 'Invoice already paid' });

    const externalId = `NUSA-${invoiceId.slice(0, 8)}-${Date.now()}`;

    // Provider-agnostic mock: pada production, ganti blok ini dengan
    // Xendit: xenditClient.invoice.createInvoice({...})
    // Midtrans: snap.createTransaction({...})
    const checkoutUrl = process.env.PAYMENT_GATEWAY_URL
      ? `${process.env.PAYMENT_GATEWAY_URL}/pay/${externalId}`
      : `http://localhost:3001/api/payment/mock-pay/${externalId}`; // mock untuk dev

    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        externalId,
        checkoutUrl,
        status: 'PENDING',
        amountCents: invoice.totalCents,
        expiredAt,
      }
    });

    res.status(201).json({
      paymentId: payment.id,
      externalId,
      checkoutUrl,
      amount: invoice.totalCents,
      expiredAt
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payment/mock-pay/:externalId — simulasi pembayaran berhasil (dev only)
app.get('/api/payment/mock-pay/:externalId', async (req, res) => {
  const { externalId } = req.params;
  // Langsung trigger webhook ke diri sendiri
  res.redirect(`/api/payment/webhook?externalId=${externalId}&status=SUCCESS`);
});

// POST (atau GET) /api/payment/webhook — callback dari payment gateway
// Pada production, verifikasi signature/token dari Xendit atau Midtrans sebelum memproses
app.all('/api/payment/webhook', async (req, res) => {
  // Support body JSON (POST) atau query string (GET mock)
  const body = Object.assign({}, req.query, req.body);
  const { externalId, status } = body;

  if (!externalId) return res.status(400).json({ error: 'externalId is required' });

  try {
    const payment = await prisma.payment.findUnique({ where: { externalId } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (status === 'SUCCESS' || status === 'PAID') {
      const now = new Date();

      // 1. Update status Payment
      await prisma.payment.update({
        where: { externalId },
        data: { status: 'SUCCESS', paidAt: now, gatewayResponse: body }
      });

      // 2. Update Invoice -> PAID
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'PAID', paidAt: now }
      });

      // 3. Catat Ledger Entries (double-entry bookkeeping)
      const platformFeeCents = Math.floor(payment.amountCents * PLATFORM_FEE_PERCENT / 100);
      const workerShareCents = payment.amountCents - platformFeeCents;

      await prisma.ledgerEntry.createMany({
        data: [
          // Uang masuk dari Customer (DEBIT ke CUSTOMER_PAYMENT)
          {
            paymentId: payment.id,
            account: 'CUSTOMER_PAYMENT',
            type: 'DEBIT',
            amountCents: payment.amountCents,
            description: `Pembayaran diterima untuk Invoice ${payment.invoiceId}`,
            referenceId: payment.invoiceId
          },
          // Pendapatan Platform (CREDIT ke PLATFORM_REVENUE)
          {
            paymentId: payment.id,
            account: 'PLATFORM_REVENUE',
            type: 'CREDIT',
            amountCents: payment.amountCents,
            description: `Total pendapatan dari Invoice ${payment.invoiceId}`,
            referenceId: payment.invoiceId
          },
          // Platform Fee dipotong (DEBIT ke PLATFORM_FEE)
          {
            paymentId: payment.id,
            account: 'PLATFORM_FEE',
            type: 'DEBIT',
            amountCents: platformFeeCents,
            description: `Platform fee ${PLATFORM_FEE_PERCENT}% dari Invoice ${payment.invoiceId}`,
            referenceId: payment.invoiceId
          },
          // Bagian Worker (CREDIT ke WORKER_WALLET)
          {
            paymentId: payment.id,
            account: 'WORKER_WALLET',
            type: 'CREDIT',
            amountCents: workerShareCents,
            description: `Hak worker dari Invoice ${payment.invoiceId} (${100 - PLATFORM_FEE_PERCENT}%)`,
            referenceId: payment.invoiceId
          }
        ]
      });

      return res.json({ ok: true, message: 'Payment processed and ledger updated' });
    }

    if (status === 'FAILED' || status === 'EXPIRED') {
      await prisma.payment.update({
        where: { externalId },
        data: { status: status === 'EXPIRED' ? 'EXPIRED' : 'FAILED', gatewayResponse: body }
      });
      return res.json({ ok: true, message: `Payment marked as ${status}` });
    }

    res.json({ ok: false, message: 'Unrecognized status, no action taken' });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payment/ledger — arus kas semua akun
app.get('/api/payment/ledger', async (req, res) => {
  try {
    const { account, limit = '100' } = req.query;
    const where = account ? { account } : {};
    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: { payment: { select: { externalId: true, invoiceId: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Hitung saldo per akun
    const balances = await prisma.ledgerEntry.groupBy({
      by: ['account', 'type'],
      _sum: { amountCents: true }
    });

    const summary = {};
    for (const b of balances) {
      if (!summary[b.account]) summary[b.account] = { DEBIT: 0, CREDIT: 0, net: 0 };
      summary[b.account][b.type] = b._sum.amountCents || 0;
    }
    for (const acc of Object.keys(summary)) {
      summary[acc].net = summary[acc].CREDIT - summary[acc].DEBIT;
    }

    res.json({ entries, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// WEEK 3: MARKETPLACE API
// ==========================================

app.get('/api/marketplace/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: { customer: true, tasks: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketplace/projects', async (req, res) => {
  try {
    const { customerId, title, description, budget, workerCount, deadline } = req.body;
    const project = await prisma.project.create({
      data: { customerId, title, description, budget, workerCount, deadline: deadline ? new Date(deadline) : null }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketplace/projects/:id/tasks', async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      where: { projectId: req.params.id },
      include: { qualifications: true, assignments: true, submissions: true }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketplace/projects/:id/tasks', async (req, res) => {
  try {
    const { title, description, compensationCents, maxWorkers, requiredSkills } = req.body;
    const task = await prisma.projectTask.create({
      data: {
        projectId: req.params.id,
        title, description, compensationCents, maxWorkers,
        requiredSkills: requiredSkills || []
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketplace/tasks/:id/qualify', async (req, res) => {
  try {
    const { workerId, score, notes, status } = req.body;
    const qual = await prisma.qualification.upsert({
      where: { taskId_workerId: { taskId: req.params.id, workerId } },
      update: { score, notes, status, screenedAt: new Date() },
      create: { taskId: req.params.id, workerId, score, notes, status, screenedAt: new Date() }
    });
    res.json(qual);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketplace/tasks/:id/assign', async (req, res) => {
  try {
    const { workerId } = req.body;
    const assign = await prisma.assignment.create({
      data: { taskId: req.params.id, workerId, status: 'ACTIVE' }
    });
    res.json(assign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketplace/tasks/:id/submit', async (req, res) => {
  try {
    const { workerId, result, notes } = req.body;
    const sub = await prisma.marketplaceSubmission.create({
      data: { taskId: req.params.id, workerId, result, notes }
    });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// WEEK 4: COMPLIANCE & AUDIT API
// ==========================================

app.post('/api/compliance/consent', async (req, res) => {
  try {
    const { userId, type, granted } = req.body;
    if (!userId || !type) return res.status(400).json({ error: 'userId and type are required' });
    
    let consent;
    if (granted) {
      consent = await prisma.consent.create({
        data: { userId, type }
      });
    } else {
      consent = await prisma.consent.deleteMany({
        where: { userId, type }
      });
    }
    res.json({ success: true, consent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/compliance/consent', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const consents = await prisma.consent.findMany({ where: { userId } });
    res.json(consents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/compliance/verify', async (req, res) => {
  try {
    const { entityId, entityType, validatorId, status, score, notes } = req.body;
    const record = await prisma.dataQualityRecord.create({
      data: { entityId, entityType, validatorId, status, score, notes }
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// WEEK 5: NOTIFICATION & REAL-TIME API
// ==========================================

app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() }
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/stream', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).end();
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(': Connected to NUSA SSE Stream\n\n');

  // Listener for events matching this userId
  const eventName = `notification:${userId}`;
  const listener = (notification) => {
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  };

  notificationEmitter.on(eventName, listener);

  req.on('close', () => {
    notificationEmitter.off(eventName, listener);
  });
});

// ==========================================
// WEEK 6: AI & AUTOMATION (MATCHMAKING)
// ==========================================

// GET: Top candidates for a specific marketplace task
app.get('/api/marketplace/tasks/:id/candidates', async (req, res) => {
  try {
    const candidates = await aiMatchmaker.findCandidatesForTask(req.params.id);
    res.json({ success: true, taskId: req.params.id, candidates });
  } catch (error) {
    console.error('AI Matchmaker candidates error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET: Recommended tasks for a specific worker
app.get('/api/marketplace/tasks/recommended', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const recommendations = await aiMatchmaker.recommendTasksForWorker(userId);
    res.json({ success: true, userId, recommendations });
  } catch (error) {
    console.error('AI Matchmaker recommendations error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET: Score a single user-task pair
app.get('/api/matchmaking/score', async (req, res) => {
  try {
    const { userId, taskId } = req.query;
    if (!userId || !taskId) return res.status(400).json({ error: 'userId and taskId are required' });
    
    const result = await aiMatchmaker.scoreUserTask(userId, taskId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('AI Matchmaker score error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET: AI Match scores for all opportunities (for logged-in user)
// Calculates heuristic match scores between a user's profile and available opportunities
app.get('/api/matchmaking/opportunity-scores', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        experiences: true,
        employmentHistory: true,
        evidences: true,
        workDNA: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch opportunities
    let opportunities = [];
    try {
      opportunities = await prisma.opportunity.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
    } catch { /* table may not exist yet */ }

    if (opportunities.length === 0) {
      opportunities = REAL_OPPORTUNITY_SEED;
    }

    // Score each opportunity against user profile
    const scored = opportunities.map(opp => {
      // Treat opportunity as a pseudo-task for scoring
      const pseudoTask = {
        title: opp.title || '',
        description: opp.description || '',
        requiredSkills: opp.requiredSkills || []
      };
      const { score, reasons, explanation, breakdown } = aiMatchmaker.calculateMatchScore(pseudoTask, user);
      return {
        opportunityId: opp.id,
        matchScore: score,
        matchReasons: reasons,
        matchExplanation: explanation,
        matchBreakdown: breakdown
      };
    });

    res.json({ success: true, userId, scores: scored });
  } catch (error) {
    console.error('Opportunity scoring error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET: AI Match scores for all marketplace projects (for logged-in user)
app.get('/api/matchmaking/project-scores', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        experiences: true,
        employmentHistory: true,
        evidences: true,
        workDNA: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch projects with tasks
    const projects = await prisma.project.findMany({
      include: { tasks: true, customer: true },
      orderBy: { createdAt: 'desc' }
    });

    const scored = projects.map(proj => {
      // Combine project + task info for richer scoring
      const allSkills = (proj.tasks || []).flatMap(t => t.requiredSkills || []);
      const allDescs = (proj.tasks || []).map(t => t.description || '').join(' ');
      const pseudoTask = {
        title: proj.title || '',
        description: `${proj.description || ''} ${allDescs}`,
        requiredSkills: [...new Set(allSkills)]
      };
      const { score, reasons, explanation, breakdown } = aiMatchmaker.calculateMatchScore(pseudoTask, user);
      return {
        projectId: proj.id,
        matchScore: score,
        matchReasons: reasons,
        matchExplanation: explanation,
        matchBreakdown: breakdown
      };
    });

    res.json({ success: true, userId, scores: scored });
  } catch (error) {
    console.error('Project scoring error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'nusa-api', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'nusa-api', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🇮🇩 NUSA AI API running on port ${PORT}`));
