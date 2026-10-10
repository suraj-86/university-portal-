const modules = [
    require('./health'),
    require('./calendar'),
    require('./timetable')
];

module.exports = (app, ctx) => {
    modules.forEach((register) => register(app, ctx));
};
