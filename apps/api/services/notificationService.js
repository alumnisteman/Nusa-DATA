const { PrismaClient } = require('@prisma/client');
const EventEmitter = require('events');

const prisma = new PrismaClient();

// Global event emitter untuk push notification via SSE
class NotificationEmitter extends EventEmitter {}
const notificationEmitter = new NotificationEmitter();

/**
 * Menyimpan notifikasi ke database dan memancarkannya secara real-time via SSE
 */
const sendNotification = async ({ userId, type, title, body, data = {} }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data,
        isRead: false
      }
    });

    // Emit event (format: "notification:{userId}")
    notificationEmitter.emit(`notification:${userId}`, notification);
    return notification;
  } catch (error) {
    console.error("Failed to send notification:", error.message);
    throw error;
  }
};

module.exports = {
  notificationEmitter,
  sendNotification
};
