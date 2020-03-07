/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack')
const merge = require('webpack-merge')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ErrorOverlayPlugin = require('error-overlay-webpack-plugin')
const commonConfig = require('./webpack.common')

const config = merge(commonConfig, {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  devServer: {
    host: '0.0.0.0',
    overlay: {
      error: true,
      warning: true,
    },
    contentBase: [__dirname],
    watchContentBase: true,
    hot: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
    new ErrorOverlayPlugin(),
    new webpack.HotModuleReplacementPlugin(),
  ],
})

module.exports = config
