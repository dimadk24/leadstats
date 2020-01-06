const path = require('path')

let config = {
  entry: './src/index.js',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
}

module.exports = (env) => {
  if (env.mode === 'development') config.devtool = 'eval-source-map'
  config.mode = env.mode
  return config
}
