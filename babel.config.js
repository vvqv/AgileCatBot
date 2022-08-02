module.exports = function (api) {
    api.cache(false);
    const presets = [['@babel/preset-typescript'], ['@babel/preset-react'], ['@babel/preset-env']];

    return {
        presets,
    };
};
