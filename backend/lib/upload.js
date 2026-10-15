const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx']);
const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const safeStoredName = (originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    const base = path.basename(originalName, path.extname(originalName))
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60) || 'file';
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
};

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) { cb(null, uploadDir); },
        filename(req, file, cb) { cb(null, safeStoredName(file.originalname)); }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
            return cb(new Error('Only PDF, DOC and DOCX files up to 5 MB are allowed.'));
        }
        cb(null, true);
    }
});

const singleAttachment = (req, res, next) =>
    upload.single('attachment')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE' ? 'The file is larger than 5 MB.' : (err.message || 'Upload failed.');
            return res.status(400).json({ success: false, error: message });
        }
        next();
    });

const removeAttachment = (url) => {
    if (!url) return;
    const file = path.join(uploadDir, path.basename(String(url)));
    fs.unlink(file, () => {});
};

module.exports = { singleAttachment, removeAttachment, uploadDir, safeStoredName };
