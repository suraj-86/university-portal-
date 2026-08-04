const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Connect to your existing database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Your MySQL password
    database: 'college_ms',
    port: 3307    // Using your specific port
});

const createPermanentAdmin = async () => {
    try {
        // The permanent credentials you want for your admin
        const username = 'admin';
        const plainPassword = 'admin123'; 
        
        // Securely hash the password
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Insert or update the admin account in the database
        const sql = `
            INSERT INTO users (username, password, role) 
            VALUES (?, ?, 'admin') 
            ON DUPLICATE KEY UPDATE password = ?
        `;

        db.query(sql, [username, hashedPassword, hashedPassword], (err, result) => {
            if (err) {
                console.error("❌ Database Error:", err.message);
                process.exit(1);
            }
            console.log("✅ Permanent Admin successfully secured in the database.");
            console.log(`Username: ${username} | Password: ${plainPassword}`);
            console.log("You can safely delete this script now if you wish.");
            process.exit(0);
        });
    } catch (error) {
        console.error("❌ Hashing Error:", error.message);
        process.exit(1);
    }
};

createPermanentAdmin();