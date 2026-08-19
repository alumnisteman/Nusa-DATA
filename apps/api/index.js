const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const amqp = require('amqplib');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

let channel;
async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://nusa_admin:nusa_password@localhost:5672');
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'nusa-api', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🇮🇩 NUSA AI API running on port ${PORT}`));
