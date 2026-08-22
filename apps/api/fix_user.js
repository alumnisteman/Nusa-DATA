const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.user.deleteMany({
    where: { email: 'valingir@gmail.com' }
  });
  console.log('Deleted users:', result.count);
}
main().catch(console.error);
