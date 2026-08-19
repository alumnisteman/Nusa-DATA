const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function startWorker() {
    console.log('🔔 Notification Worker starting...');
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://restart:changeme@localhost:5672');
        const channel = await connection.createChannel();
        await channel.assertQueue('notifications', { durable: true });
        console.log('🔔 Notification Worker connected to RabbitMQ and listening on notifications queue');
        
        channel.consume('notifications', async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                console.log('Sending Notification:', content);
                // Perform dummy processing (e.g. email, SMS, push notification)
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Notification Worker error:', error.message);
        setTimeout(startWorker, 5000);
    }
}

startWorker();
