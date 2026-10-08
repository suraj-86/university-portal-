const modules = [
    require('./health')
];

module.exports = (app, ctx) => {
    modules.forEach((register) => register(app, ctx));
};
