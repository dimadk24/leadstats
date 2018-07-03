const path = require('path');

let config = {
    entry: './src/index.js',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"}
        ]
    }
};

module.exports = env => {
    if (env.mode === 'development')
        config.devtool = 'inline-source-map';
    config.mode = env.mode;
    return config;
};