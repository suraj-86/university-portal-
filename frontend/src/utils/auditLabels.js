export const prettyAction = (action) => {
    const s = String(action || '').toLowerCase().replace(/_/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
};

export const actionTone = (action) => {
    const a = String(action || '');
    if (/DELETE|VACATE/.test(a)) return 'rose';
    if (/IMPORT/.test(a)) return 'violet';
    if (/CREATE|ALLOCATE|SEND|SCHEDULE/.test(a)) return 'emerald';
    if (/UPDATE|EDIT|CHANGE/.test(a)) return 'blue';
    return 'slate';
};
