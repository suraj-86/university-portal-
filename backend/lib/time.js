const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const todayInTZ = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

const weekdayName = (isoDate) =>
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        new Date(`${isoDate}T00:00:00Z`).getUTCDay()];

module.exports = { todayInTZ, weekdayName, TZ };
