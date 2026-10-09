const modules = [
    require('./health'),
    require('./calendar')
];

module.exports = (app, ctx) => {
    modules.forEach((register) => register(app, ctx));
};
