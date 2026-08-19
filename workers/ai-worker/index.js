const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function startWorker() {
    console.log('🤖 AI Worker starting...');
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://restart:changeme@localhost:5672');
        const channel = await connection.createChannel();
        await channel.assertQueue('ai.tasks', { durable: true });
        console.log('🤖 AI Worker connected to RabbitMQ and listening on ai.tasks queue');
        
        channel.consume('ai.tasks', async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                console.log('Processing AI Task:', content);
                // Perform dummy processing
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('AI Worker error:', error.message);
        setTimeout(startWorker, 5000);
    }
}

startWorker();
