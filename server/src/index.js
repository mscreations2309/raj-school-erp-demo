import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { prepareDatabase } from './lib/demo.js';

const port = Number(process.env.PORT) || 5000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`\n  RnY EduSuite API running → http://localhost:${port}/api/health\n`);
  // Listen first (hosting health checks), then load data only if the database is empty
  if (process.env.SEED_MODE) prepareDatabase().catch((e) => console.error('Data preparation failed', e));
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
