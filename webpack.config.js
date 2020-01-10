const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const hello = 'hello-world';
const example = process.env.NAME || hello;
const tip = '使用 `NAME=[example-name] npm run example` 指定用例';

/**
 * @type {import('webpack/declarations/WebpackOptions').WebpackOptions}
 */
module.exports = {
  entry: `./src/examples/${example}`,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    publicPath: process.env.TAEGET === 'pages' ? `/gem/build/${example}` : '/',
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'build', example),
  },
  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV', 'NAME', 'EXAMPLES', 'npm_package_version']),
    new HtmlWebpackPlugin(),
    {
      apply(compiler) {
        compiler.hooks.done.tapAsync('MyCustomPlugin', function(_compiler, callback) {
          if (!process.env.NAME) setTimeout(() => console.log(`\n${tip}`));
          callback();
        });
      },
    },
  ],
  devServer: {
    contentBase: path.join('./build', example),
    open: true,
    historyApiFallback: true,
  },
  devtool: 'source-map',
};
