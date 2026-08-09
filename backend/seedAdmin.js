require('dotenv').config();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const readline = require('readline');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const createPermanentAdmin = async () => {
    try {
        if (!process.env.DB_HOST || !process.env.DB_NAME) {
            console.error(
                "❌ DB_HOST / DB_NAME are not set. Make sure your .env file is configured " +
                "the same way it is for server.js before running this script."
            );
            process.exit(1);
        }

        console.log("=== Admin Account Setup ===");
        console.log(`Target database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

        const username = (await ask("Admin username [admin]: ")).trim() || "admin";
        const plainPassword = (await ask("Admin password (min 8 chars): ")).trim();

        rl.close();

        if (plainPassword.length < 8) {
            console.error("❌ Password must be at least 8 characters long.");
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const sql = `
            INSERT INTO users (username, password, role)
            VALUES (?, ?, 'admin')
            ON DUPLICATE KEY UPDATE password = ?
        `;

        db.query(sql, [username, hashedPassword, hashedPassword], (err) => {
            if (err) {
                console.error("❌ Database Error:", err.message);
                process.exit(1);
            }

            console.log("✅ Admin account created/updated successfully.");
            console.log(`Username: ${username}`);
            console.log("Password: (the one you just entered — not printed here for safety)");
            console.log("You can safely delete this script now if you wish.");
            db.end();
            process.exit(0);
        });
    } catch (error) {
        console.error("❌ Hashing/Setup Error:", error.message);
        process.exit(1);
    }
};

createPermanentAdmin();
