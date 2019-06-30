const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const hello = 'hello-world'

module.exports = {
  entry: `./examples/${process.env.EXAMPLE || hello}/index.ts`,
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
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'temp'),
  },
  plugins: [new HtmlWebpackPlugin()],
  devServer: {
    contentBase: `./temp`,
  },
  devtool: 'source-map',
}
