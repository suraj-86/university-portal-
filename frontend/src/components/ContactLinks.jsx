import React from 'react';
import { Phone, Mail, MessageCircle } from 'lucide-react';

const digits = (v) => String(v || '').replace(/\D/g, '');
const waNumber = (v) => {
    const d = digits(v);
    return d.length === 10 ? `91${d}` : d;
};

const chip = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors max-w-full';

const ContactLinks = ({ phone, whatsapp, email }) => {
    if (!phone && !whatsapp && !email) {
        return <span className="text-xs font-medium text-slate-400">No contact details on file</span>;
    }
    return (
        <div className="flex flex-wrap gap-2">
            {phone && (
                <a href={`tel:${String(phone).replace(/[^\d+]/g, '')}`} className={chip}>
                    <Phone size={13} className="shrink-0" /> <span className="truncate">{phone}</span>
                </a>
            )}
            {whatsapp && (
                <a href={`https://wa.me/${waNumber(whatsapp)}`} target="_blank" rel="noopener noreferrer" className={chip}>
                    <MessageCircle size={13} className="shrink-0" /> <span className="truncate">WhatsApp {whatsapp}</span>
                </a>
            )}
            {email && (
                <a href={`mailto:${email}`} className={chip}>
                    <Mail size={13} className="shrink-0" /> <span className="truncate">{email}</span>
                </a>
            )}
        </div>
    );
};

export default ContactLinks;
