require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const dir = path.join(__dirname, 'migrations');
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
});

const q = (sql, params) => new Promise((res, rej) =>
    conn.query(sql, params, (e, r) => (e ? rej(e) : res(r))));

(async () => {
    try {
        await q(`CREATE TABLE IF NOT EXISTS schema_migrations (
            filename VARCHAR(255) NOT NULL PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        const done = new Set((await q('SELECT filename FROM schema_migrations')).map(r => r.filename));
        const files = fs.readdirSync(dir).filter(f => /^\d+.*\.sql$/.test(f)).sort();
        let applied = 0;
        for (const f of files) {
            if (done.has(f)) { console.log('skip   ', f); continue; }
            console.log('applying', f);
            await q(fs.readFileSync(path.join(dir, f), 'utf8'));
            await q('INSERT INTO schema_migrations (filename) VALUES (?)', [f]);
            applied++;
        }
        console.log(`Done. ${applied} migration(s) applied.`);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exitCode = 1;
    } finally {
        conn.end();
    }
})();
