const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const amqp = require('amqplib');

const crypto = require('crypto');

const app = express();
const prisma = new PrismaClient();
const { OFFICIAL_BPS_DATA, REAL_OPPORTUNITY_SEED, scrapeAndIngestData } = require('./scraper');

app.use(cors());
app.use(express.json());

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
        const totalEvaluations = await prisma.response.count();
        const totalTasks = await prisma.task.count();
        const activeTasks = await prisma.task.count({ where: { status: 'ACTIVE' } });
        
        res.json({
            activeEvaluations: activeTasks,
            samples: totalEvaluations,
            qualityScore: 94.7, // Target quality score
            budgetUsed: (totalEvaluations * 1200 / 15000).toFixed(2), // Mock budget in USD equivalent or IDR
            avgTurnaround: "4h 12m"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Leaderboard Model Arena
app.get('/api/buyer/leaderboard', async (req, res) => {
    try {
        const models = await prisma.model.findMany({
            orderBy: { scoreGlobal: 'desc' }
        });
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Buat evaluasi baru dari Buyer
app.post('/api/buyer/evaluations', async (req, res) => {
    const { prompt, modelAId, responseA, modelBId, responseB, category } = req.body;
    try {
        let m1 = modelAId;
        let m2 = modelBId;
        if (!m1) {
            const model = await prisma.model.findFirst({ where: { name: "GPT-X" } });
            m1 = model ? model.id : null;
        }
        if (!m2) {
            const model = await prisma.model.findFirst({ where: { name: "Claude-X" } });
            m2 = model ? model.id : null;
        }

        const task = await prisma.task.create({
            data: {
                buyerId: "buyer_001",
                prompt,
                modelAId: m1,
                responseA,
                modelBId: m2,
                responseB,
                category: category || "General"
            }
        });
        res.json({ success: true, task });
    } catch (error) {
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'nusa-api', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'nusa-api', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🇮🇩 NUSA AI API running on port ${PORT}`));
