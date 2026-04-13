const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');

const buildPath = path.resolve(__dirname, 'build');

module.exports = {
  context: path.resolve('./example'),
  entry: './main.ts',
  output: {
    filename: 'example.bundle.js',
    path: buildPath,
  },
  devtool: 'eval-cheap-source-map',
  devServer: {
    compress: true,
    port: 5000,
    watchFiles: { options: { ignored: ['**/docs/data/**', '**/data/**'] } },
    static: [
      { directory: path.resolve(__dirname, 'example') },
      {
        directory: path.resolve(__dirname, 'docs'),
        publicPath: '/',
        watch: { ignored: /data[\\/]/ },
      },
      {
        directory: path.resolve(__dirname),
        publicPath: '/',
        watch: { ignored: /data[\\/]/ },
      },
    ],
    setupMiddlewares(middlewares, devServer) {
      devServer.app.use('/save-settings', (req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          const dest = path.resolve(__dirname, 'docs/data/settings.json');
          fs.writeFileSync(dest, body, 'utf8');
          res.json({ ok: true });
        });
      });
      return middlewares;
    },
  },
  stats: 'errors-only',
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
      },
      {
        test: /\.(vs|fs|glsl|vert|frag)$/,
        loader: 'raw-loader',
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: { minimize: true },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [new HtmlWebpackPlugin()],
};
