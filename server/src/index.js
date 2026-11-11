import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { isDemo, seedIfEmpty, scheduleNightlyReset } from './lib/demo.js';

const port = Number(process.env.PORT) || 5000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`\n  RnY EduSuite API running → http://localhost:${port}/api/health\n`);
  if (isDemo()) {
    // Start listening first (hosting health checks), then load demo data if the DB is empty
    seedIfEmpty().catch((e) => console.error('Demo seed failed', e));
    scheduleNightlyReset();
  }
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
