// obix-config-webpack/development
// Development webpack configuration.
// Fast incremental rebuilds, eval source maps, transpileOnly for speed.
//
// Usage:
//   webpack --config node_modules/obix-config-webpack/development/webpack.config.js

import path from 'node:path';
import { createRequire } from 'node:module';
import webpack from 'webpack';

const _require = createRequire(import.meta.url);

const pkg = (() => {
  try {
    return _require(path.resolve(process.cwd(), 'package.json'));
  } catch {
    return {
      version: process.env.npm_package_version ?? '0.0.0',
      peerDependencies: {},
    };
  }
})();

/** @type {import('webpack').Configuration} */
export default {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'index.js',
    clean: true,
  },
  target: 'web',
  devtool: 'eval-cheap-module-source-map',
  cache: { type: 'filesystem' },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(process.cwd(), 'tsconfig.json'),
              // transpileOnly skips type-checking for faster dev builds
              // run tsc --noEmit separately for type validation
              transpileOnly: true,
              experimentalWatchApi: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      '__OBIX_VERSION__': JSON.stringify(pkg.version),
      '__DEV__': JSON.stringify(true),
    }),
    new webpack.ProgressPlugin(),
  ],
  externals: Object.fromEntries(
    Object.keys(pkg.peerDependencies ?? {}).map((k) => [k, k]),
  ),
  optimization: {
    minimize: false,
    runtimeChunk: 'single',
  },
  stats: 'errors-warnings',
};
