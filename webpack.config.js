const path = require('path');

module.exports = {
    entry: './src/index.js',
    // devtool: 'inline-source-map',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname)
    },
    module: {
        rules: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
        ]
    }
};