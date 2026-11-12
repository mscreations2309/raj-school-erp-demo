import EmbeddedPostgres from 'embedded-postgres';
import os from 'node:os'; import path from 'node:path';
const pg = new EmbeddedPostgres({ databaseDir: path.join(os.tmpdir(), 'rny-pg-data2'), user: 'postgres', password: 'pg', port: 5544, persistent: false });
await pg.initialise(); await pg.start(); await pg.createDatabase('rajschool');
console.log('PG READY');
process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
