const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const index = 'index';
const example = process.env.NAME || index;
const tip = '使用 `NAME=[example-name] npm run example` 指定用例';
const examples = fs.readdirSync('src/examples').filter((name) => name !== 'elements');
const files = fs.readdirSync(`src/examples/${example}`).filter((file) => file.endsWith('.ts'));
const metadata = {};
examples.forEach((example) => {
  try {
    metadata[example] = require(`./src/examples/${example}/manifest.json`);
  } catch {
    metadata[example] = {};
  }
});

/**
 * @type {import('webpack').Configuration}
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
    publicPath: process.env.TAEGET === 'pages' ? `/${example}/` : '/',
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'build', example),
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.TAEGET': JSON.stringify(process.env.TAEGET),
      'process.env.EXAMPLE': JSON.stringify(example),
      'process.env.EXAMPLES': JSON.stringify(examples),
      'process.env.FILES': JSON.stringify(files),
      'process.env.METADATA': JSON.stringify(metadata),
      'process.env.TAEGET': JSON.stringify(process.env.TAEGET),
    }),
    new HtmlWebpackPlugin(),
    {
      apply(compiler) {
        compiler.hooks.done.tapAsync('MyCustomPlugin', function (_compiler, callback) {
          if (!process.env.NAME) setTimeout(() => console.log(`\n${tip}`));
          callback();
        });
      },
    },
  ],
  devServer: {
    disableHostCheck: true,
    contentBase: path.join('./build', example),
    open: true,
    historyApiFallback: true,
  },
  devtool: 'source-map',
};
