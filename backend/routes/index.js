const modules = [
    require('./health'),
    require('./calendar'),
    require('./timetable'),
    require('./attendance'),
    require('./marks'),
    require('./notices'),
    require('./announcements'),
    require('./messages'),
    require('./inbox')
];

module.exports = (app, ctx) => {
    modules.forEach((register) => register(app, ctx));
};
