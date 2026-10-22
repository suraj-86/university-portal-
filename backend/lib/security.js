const DEFAULT_ORIGINS = [
    'https://university-portal-flax-tau.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8081'
];

const allowedOrigins = () => {
    const extra = String(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return [...DEFAULT_ORIGINS, ...extra];
};

const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    next();
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const originGuard = (origins = allowedOrigins()) => (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) {
        return res.status(403).json({ success: false, error: 'This request was blocked because it came from an unknown site.' });
    }
    next();
};

module.exports = { allowedOrigins, securityHeaders, originGuard };
