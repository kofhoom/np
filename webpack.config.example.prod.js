const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

const buildPath = path.resolve(__dirname, 'docs');

module.exports = {
  context: path.resolve('./example'),
  entry: './main.ts',
  output: {
    filename: 'example.bundle.js',
    path: buildPath,
    clean: { keep: /(data\/|draco\/)/ },
  },
  mode: 'production',
  devtool: false,
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        loader: 'worker-loader',
        options: { inline: 'no-fallback' },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: { transpileOnly: true },
      },
      {
        test: /\.(vs|fs|glsl|vert|frag)$/,
        loader: 'raw-loader',
      },
      {
        test: /\.html$/,
        use: [{ loader: 'html-loader', options: { minimize: true } }],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ title: 'Orthodox Church Viewer' }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'data/interior-view-of-orthodox-church-of-al-tahira/song'), to: 'data/song', filter: (resourcePath) => !resourcePath.endsWith('.wav') },
        { from: path.resolve(__dirname, 'node_modules/three/examples/jsm/libs/draco/gltf'), to: 'draco' },
      ],
    }),
  ],
};
