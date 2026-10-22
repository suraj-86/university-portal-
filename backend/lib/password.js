const crypto = require('crypto');
const bcrypt = require('bcrypt');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

const generatePassword = (length = 10) =>
    Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

const BCRYPT_COST = 12;
const hashPassword = (plain, cost = BCRYPT_COST) => bcrypt.hash(plain, cost);

const passwordProblem = (value) => {
    if (typeof value !== 'string' || value.length < 8) return 'Password must be at least 8 characters long.';
    if (Buffer.byteLength(value) > 72) return 'Password is too long (72 characters at most).';
    return null;
};

const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_COST);

module.exports = { generatePassword, hashPassword, passwordProblem, DUMMY_HASH };
