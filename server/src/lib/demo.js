// Demo-mode helpers: load demo data on an empty database and reset it every night.
import { spawn } from 'node:child_process';
import { prisma } from './prisma.js';

export const isDemo = () => process.env.DEMO_MODE === 'true';

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))));
  });

let busy = false;

export async function seedIfEmpty() {
  const plans = await prisma.plan.count().catch(() => 0);
  if (plans > 0) return;
  console.log('⏳ Empty database — loading demo data…');
  busy = true;
  try { await run('node', ['prisma/seed.js']); } finally { busy = false; }
}

export async function resetDemo() {
  if (busy) return;
  busy = true;
  console.log('⏳ Nightly demo reset…');
  try {
    await run('npx', ['prisma', 'db', 'push', '--force-reset', '--skip-generate', '--accept-data-loss']);
    await run('node', ['prisma/seed.js']);
    console.log('✔ Demo reset complete');
  } catch (e) {
    console.error('Demo reset failed', e);
  } finally { busy = false; }
}

/** Runs resetDemo() daily at 02:00 IST (20:30 UTC). */
export function scheduleNightlyReset() {
  const next = () => {
    const now = new Date();
    const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 30));
    if (t <= now) t.setUTCDate(t.getUTCDate() + 1);
    return t - now;
  };
  const loop = () => setTimeout(async () => { await resetDemo(); loop(); }, next());
  loop();
}
