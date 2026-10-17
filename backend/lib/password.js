const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

const generatePassword = (length = 10) =>
    Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

module.exports = { generatePassword };
