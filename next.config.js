const path = require('path');
const fs = require('fs');

const BASE_PATH = process.env.BASE_PATH || '';

module.exports = {
  target: 'serverless',
  basePath: BASE_PATH,
  compress: true,
  reactStrictMode: true,
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|webm)$/i,
      use: {
        loader: 'file-loader',
        options: {
          esModule: false,
          publicPath: path.join('/', BASE_PATH, '_next/static'),
          outputPath: 'static'
        }
      }
    });
    config.plugins.push(new webpack.DefinePlugin({
      __SOURCE__: webpack.DefinePlugin.runtimeValue(v => {
        // Load the source file and set it as a global definition.
        // This is useful for easily embedding a file's source into the page.
        let filePath = v.module.rawRequest;
        filePath = filePath.replace('private-next-pages', path.join(__dirname, 'src/pages'));

        const source = fs.readFileSync(filePath, 'utf-8');
        return JSON.stringify(source); // Strings need to be wrapped in quotes
      }, [])
    }));

    return config;
  },
}
