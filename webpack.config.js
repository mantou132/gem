const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const hello = 'hello-world';
const example = process.env.NAME;
const tip = '使用 `NAME=[example-name] npm run example` 指定用例';

module.exports = {
  entry: `./src/examples/${example || hello}/`,
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
    publicPath: '/',
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'temp'),
  },
  plugins: [
    new HtmlWebpackPlugin(),
    {
      apply(compiler) {
        compiler.hooks.done.tapAsync('MyCustomPlugin', function(_compiler, callback) {
          if (!example) setTimeout(() => console.log(`\n${tip}`));
          callback();
        });
      },
    },
  ],
  devServer: {
    contentBase: './temp',
    open: true,
    historyApiFallback: true,
  },
  devtool: 'source-map',
};
