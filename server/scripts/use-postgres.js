// Switches the Prisma datasource to PostgreSQL when DATABASE_URL is a Postgres URL.
// Local development keeps SQLite (zero install); cloud deploys (Render/Neon) use PostgreSQL.
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.DATABASE_URL || '';
const file = path.resolve(process.cwd(), 'prisma/schema.prisma');
if (/^postgres(ql)?:\/\//.test(url)) {
  const src = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, src.replace('provider = "sqlite"', 'provider = "postgresql"'));
  console.log('✔ Prisma provider set to postgresql');
} else {
  console.log('ℹ DATABASE_URL is not Postgres — keeping SQLite');
}
