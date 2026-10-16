const modules = [
    require('./health'),
    require('./calendar'),
    require('./timetable'),
    require('./attendance'),
    require('./marks'),
    require('./notices'),
    require('./announcements'),
    require('./messages'),
    require('./inbox'),
    require('./reportcard'),
    require('./hostel')
];

module.exports = (app, ctx) => {
    modules.forEach((register) => register(app, ctx));
};
