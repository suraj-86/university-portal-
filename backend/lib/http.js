const FRIENDLY = {
    ER_DUP_ENTRY: 'A record with these details already exists.',
    ER_ROW_IS_REFERENCED_2: 'This record is in use and cannot be removed.',
    ER_NO_REFERENCED_ROW_2: 'One of the selected items no longer exists.',
    ER_DATA_TOO_LONG: 'One of the values is too long.',
    ER_BAD_NULL_ERROR: 'A required value is missing.'
};

const publicError = (err) => {
    console.error('Request failed:', err && (err.code || err.message));
    return FRIENDLY[err && err.code] || 'Something went wrong. Please try again.';
};

module.exports = { publicError };
