const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Audit Logger Middleware
// Secara otomatis merekam jejak operasi POST, PUT, DELETE
const auditLogger = async (req, res, next) => {
  const method = req.method;
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    // Intercept response finish
    res.on('finish', async () => {
      // Hanya rekam jika sukses atau bukan error 500
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const actionMap = {
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'DELETE': 'DELETE'
          };
          
          let userId = req.user ? req.user.id : null;
          
          if (!userId && req.body && req.body.userId) {
            userId = req.body.userId;
          }

          await prisma.auditLog.create({
            data: {
              userId: userId || undefined,
              action: actionMap[method] || 'UPDATE',
              entity: req.originalUrl,
              entityId: null,
              newValues: {
                url: req.originalUrl,
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent']
              }
            }
          });
        } catch (err) {
          console.error("Failed to write audit log:", err.message);
        }
      }
    });
  }
  next();
};

module.exports = auditLogger;
