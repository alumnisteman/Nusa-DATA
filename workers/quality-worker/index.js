const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateModelArenaScores(modelId) {
    if (!modelId) return;
    try {
        const tasksA = await prisma.task.findMany({
            where: { modelAId: modelId },
            include: { responses: true }
        });
        const tasksB = await prisma.task.findMany({
            where: { modelBId: modelId },
            include: { responses: true }
        });

        let totalNatural = 0;
        let totalEmpathy = 0;
        let totalCulture = 0;
        let totalScoreCount = 0;
        let wins = 0;
        let totalGames = 0;

        const processResponses = (tasks, modelRole) => {
            for (const t of tasks) {
                for (const r of t.responses) {
                    totalGames++;
                    if (r.preference === modelRole) {
                        wins++;
                        totalNatural += r.scoreNatural;
                        totalEmpathy += r.scoreEmpathy;
                        totalCulture += r.scoreCulture;
                        totalScoreCount++;
                    }
                }
            }
        };

        processResponses(tasksA, 'A');
        processResponses(tasksB, 'B');

        if (totalGames > 0) {
            const winRate = (wins / totalGames) * 100;
            const avgNatural = totalScoreCount > 0 ? (totalNatural / totalScoreCount) * 20 : 50;
            const avgEmpathy = totalScoreCount > 0 ? (totalEmpathy / totalScoreCount) * 20 : 50;
            const avgCulture = totalScoreCount > 0 ? (totalCulture / totalScoreCount) * 20 : 50;
            const globalScore = (winRate * 0.4) + (avgNatural * 0.2) + (avgEmpathy * 0.2) + (avgCulture * 0.2);

            await prisma.model.update({
                where: { id: modelId },
                data: {
                    scoreGlobal: parseFloat(globalScore.toFixed(1)),
                    scoreNatural: parseFloat(avgNatural.toFixed(1)),
                    scoreEmpathy: parseFloat(avgEmpathy.toFixed(1)),
                    scoreCulture: parseFloat(avgCulture.toFixed(1))
                }
            });
            console.log(`🤖 Updated model ${modelId} Global score: ${globalScore.toFixed(1)}`);
        }
    } catch (e) {
        console.error('Error updating model scores:', e);
    }
}

async function startWorker() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://nusa_admin:nusa_password@localhost:5672');
        const channel = await connection.createChannel();
        await channel.assertQueue('task.submitted', { durable: true });
        console.log('🤖 Quality Worker menunggu pesan...');

        channel.consume('task.submitted', async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log(`Processing responseId: ${data.responseId}`);
                try {
                    const responses = await prisma.response.findMany({ where: { taskId: data.taskId } });
                    const countA = responses.filter(r => r.preference === 'A').length;
                    const countB = responses.filter(r => r.preference === 'B').length;
                    const majority = countA > countB ? 'A' : 'B';

                    if (data.preference === majority) {
                        await prisma.contributor.update({
                            where: { id: data.contributorId },
                            data: { 
                                reputation: { increment: 0.5 },
                                accuracy: { increment: 0.2 }
                            }
                        });
                        console.log('✅ Reputasi +0.5 & Akurasi +0.2');
                    } else {
                        console.log('⚠️ Berbeda dengan mayoritas');
                    }

                    const task = await prisma.task.findUnique({ where: { id: data.taskId } });
                    if (task) {
                        await updateModelArenaScores(task.modelAId);
                        await updateModelArenaScores(task.modelBId);
                    }

                    channel.ack(msg);
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        }, { noAck: false });
    } catch (error) {
        console.error('Worker Error:', error);
        setTimeout(startWorker, 5000);
    }
}
startWorker();
