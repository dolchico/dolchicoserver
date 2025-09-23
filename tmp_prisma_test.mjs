// tmp_prisma_test.mjs
console.log('cwd=', process.cwd());
console.log('NODE_VERSION=', process.version);
console.log('DATABASE_URL=', process.env.DATABASE_URL);
import prisma from './lib/prisma.js';
(async () => {
  try {
    const res = await prisma.couponAssignment.findMany({ take: 1 });
    console.log('RESULT', res);
  } catch (err) {
    console.error('PRISMA ERROR:');
    try { console.error('message:', err.message); } catch {}
    try { console.error('code   :', err.code); } catch {}
    try { console.error('meta   :', JSON.stringify(err.meta || err.clientVersion || err)); } catch(e){}
    console.error('stack:', err.stack);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
})();
