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
    require('./hostel'),
    require('./adminInsights'),
    require('./contacts'),
    require('./studentImport'),
    require('./feeImport'),
    require('./auditLog'),
    require('./accountAdmin'),
    require('./notifications'),
    require('./reports'),
    require('./teacherInsights'),
    require('./studentInsights'),
    require('./me')
];

module.exports = (app, ctx) => {
    modules.forEach((register) => register(app, ctx));
};
