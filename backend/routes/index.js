const modules = [
    require('./health'),
    require('./calendar'),
    require('./timetable'),
    require('./attendance'),
    require('./marks')
];
 
module.exports = (app, ctx) => {
    modules.forEach((register) => register(app, ctx));
};
 