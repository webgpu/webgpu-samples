const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const exampleList = require('./exampleList');
const exampleNames = exampleList.map(f => path.basename(f));

fs.mkdirSync(path.resolve(__dirname, '../gen'), { recursive: true });
fs.writeFileSync(path.resolve(__dirname, '../gen/exampleLoader.ts'), `
${exampleNames.map(name => {
  return `
  export const ${name} = async () => (await import('../src/examples/${name}'));
  `;
}).join('\n')}
`, 'utf-8')

module.exports = {
  mode: 'production',
  target: 'web',
  entry: exampleNames.reduce((acc, name) => {
    return Object.assign(acc, {
      [name]: path.resolve(__dirname, '../src/examples', name),
    });
  }, {
    main: path.resolve(__dirname, '../src/main'),
  }),
  output: {
    path: path.resolve(__dirname, '../dist'),
    chunkFilename: '[name]-[chunkhash:6].js',
    filename: `[name]-[hash:6].js`,
    publicPath: 'dist/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  },
  optimization: {
    splitChunks: {
      // Split each example into its own chunk
      cacheGroups: exampleNames.reduce((acc, name) => {
        return Object.assign(acc, {
          [name]: {
            test: new RegExp(`/examples/${name}`),
            name,
            priority: 100,
            enforce: true,
          }
        })
      }, {
          default: {
            enforce: true,
            priority: 1,
            name: 'common',
          },
      }),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'WebGPU Samples',
      filename: '../index.html',
      template: path.resolve(__dirname, '../src/index.html'),
      examples: exampleNames,
      excludeChunks: exampleNames,
    }),
  ],
  devtool: 'source-map',
  watchOptions: {
    ignored: ['dist/**/*.js', 'index.html']
  },
  node: {
    fs: 'empty',
  },
};
