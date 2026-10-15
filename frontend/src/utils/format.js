
export const relativeTime = (iso) => {
    if (!iso) return '';
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const diff = Date.now() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return then.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: then.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

export const fullDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const fileDisplayName = (url) => {
    const raw = String(url || '').split('/').pop() || '';
    const match = raw.match(/^\d+-\d+-(.+)$/);
    if (match) return match[1];
    const ext = (raw.match(/\.[A-Za-z0-9]+$/) || [''])[0];
    return `Attachment${ext}`;
};

export const initials = (name) =>
    String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

export const refreshInbox = () => window.dispatchEvent(new Event('inbox:refresh'));

export const validateAttachment = (file) => {
    if (!file) return '';
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) return 'Only PDF, DOC and DOCX files are allowed.';
    if (file.size > 5 * 1024 * 1024) return 'The file is larger than 5 MB.';
    return '';
};
