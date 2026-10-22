const mysql = require('mysql2');
const { sslOptions } = require('./ssl');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: sslOptions(),
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.on('connection', (conn) => {
    conn.query("SET time_zone = '+00:00'", (err) => { if (err) console.error('Could not set the DB time zone:', err.code || err.message); });
});

const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(results);
        });
    });
};

const transaction = async (work) => {
    const conn = await new Promise((resolve, reject) =>
        db.getConnection((err, c) => (err ? reject(err) : resolve(c))));
    const q = (sql, params = []) => new Promise((resolve, reject) =>
        conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
    try {
        await q('START TRANSACTION');
        const result = await work(q);
        await q('COMMIT');
        return result;
    } catch (e) {
        try { await q('ROLLBACK'); } catch (_) { }
        throw e;
    } finally {
        conn.release();
    }
};

module.exports = { db, queryAsync, transaction };
