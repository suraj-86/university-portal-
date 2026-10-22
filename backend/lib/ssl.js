const sslOptions = () => {
    const ca = process.env.DB_SSL_CA;
    if (ca) return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true };
    console.warn('DB_SSL_CA is not set: the database certificate is not being verified.');
    return { rejectUnauthorized: false };
};

module.exports = { sslOptions };
