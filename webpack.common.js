/* eslint-disable import/no-extraneous-dependencies */
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  entry: './src/index.js',
  resolve: {
    extensions: ['.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [new MiniCssExtractPlugin()],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg|eot|woff|woff2|ttf|mp3)$/,
        use: 'file-loader',
      },
    ],
  },
}
