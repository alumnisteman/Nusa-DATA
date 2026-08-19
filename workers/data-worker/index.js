const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function startWorker() {
    console.log('📊 Data Worker starting...');
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://restart:changeme@localhost:5672');
        const channel = await connection.createChannel();
        await channel.assertQueue('data.ingestion', { durable: true });
        console.log('📊 Data Worker connected to RabbitMQ and listening on data.ingestion queue');
        
        channel.consume('data.ingestion', async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                console.log('Processing Data Ingestion Task:', content);
                // Perform dummy processing
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Data Worker error:', error.message);
        setTimeout(startWorker, 5000);
    }
}

startWorker();
