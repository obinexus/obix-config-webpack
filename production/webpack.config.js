// obix-config-webpack/production
// Production webpack configuration.
// Full type-checking, terser minimisation, source maps, UMD library output.
//
// Usage:
//   webpack --config node_modules/obix-config-webpack/production/webpack.config.js

import path from 'node:path';
import { createRequire } from 'node:module';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';

const _require = createRequire(import.meta.url);

const pkg = (() => {
  try {
    return _require(path.resolve(process.cwd(), 'package.json'));
  } catch {
    return {
      name: 'obix',
      version: process.env.npm_package_version ?? '0.0.0',
      peerDependencies: {},
    };
  }
})();

// Derive library name from package name (strip scope, PascalCase)
const libraryName = (pkg.name ?? 'OBIX')
  .replace(/^@[^/]+\//, '')          // strip @scope/
  .split(/[-_]/)
  .map((/** @type {string} */ s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');

/** @type {import('webpack').Configuration} */
export default {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'index.js',
    library: {
      name: libraryName,
      type: 'umd',
      export: 'default',
    },
    globalObject: 'globalThis',
    clean: true,
  },
  target: 'web',
  devtool: 'source-map',
  cache: false,
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
              transpileOnly: false,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      '__OBIX_VERSION__': JSON.stringify(pkg.version),
      '__DEV__': JSON.stringify(false),
    }),
    new webpack.BannerPlugin({
      banner: `${pkg.name ?? 'OBIX'} v${pkg.version} | MIT License | OBINexus`,
      raw: false,
    }),
  ],
  externals: Object.fromEntries(
    Object.keys(pkg.peerDependencies ?? {}).map((k) => [k, k]),
  ),
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            pure_funcs: ['console.log', 'console.debug'],
          },
          format: { comments: false },
        },
        extractComments: false,
      }),
    ],
    usedExports: true,
    sideEffects: true,
    concatenateModules: true,
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 512_000,
    maxEntrypointSize: 512_000,
  },
  stats: { preset: 'normal', colors: true },
};
