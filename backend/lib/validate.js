
const isValidDate = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());

const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

module.exports = { isValidDate, str, isPositiveInt };
