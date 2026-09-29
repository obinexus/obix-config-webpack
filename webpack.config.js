// obix-config-webpack — base shared config (ESM)
// Environment-switched via NODE_ENV. Default mode: 'none'.
//
// Direct usage by consumer packages:
//   NODE_ENV=development  webpack --config node_modules/obix-config-webpack/webpack.config.js
//   NODE_ENV=production   webpack --config node_modules/obix-config-webpack/webpack.config.js
//
// Or import the programmatic API:
//   import { createBaseConfig } from 'obix-config-webpack';

import path from 'node:path';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);

// ─── Resolve consumer's package.json ─────────────────────────────────────────
const pkg = (() => {
  try {
    return _require(path.resolve(process.cwd(), 'package.json'));
  } catch {
    return {
      version: process.env.npm_package_version ?? '0.0.0',
      dependencies: {},
      peerDependencies: {},
    };
  }
})();

// ─── Environment ──────────────────────────────────────────────────────────────

const env = /** @type {'development'|'production'|'none'} */ (
  process.env.NODE_ENV ?? 'none'
);
const isProd = env === 'production';
const isDev = env === 'development';

// ─── Config factory ───────────────────────────────────────────────────────────

/**
 * Webpack configuration function.
 * Receives optional webpack env object and argv from the CLI.
 *
 * @param {Record<string, unknown>} _webpackEnv
 * @param {{ mode?: string }} argv
 * @returns {import('webpack').Configuration}
 */
export default function obixWebpackConfig(_webpackEnv = {}, argv = {}) {
  const mode = /** @type {'development'|'production'|'none'} */ (
    argv.mode ?? env
  );

  return {
    mode,
    entry: './src/index.ts',
    output: {
      path: path.resolve(process.cwd(), 'dist'),
      filename: 'index.js',
      library: {
        name: 'OBIX',
        type: 'umd',
        export: 'default',
      },
      globalObject: 'globalThis',
      clean: true,
    },
    target: 'web',
    devtool: isProd ? 'source-map' : isDev ? 'eval-cheap-module-source-map' : false,
    cache: isDev ? { type: 'filesystem' } : false,
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
                transpileOnly: isDev,
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      // DefinePlugin is applied inside development/production configs
      // where webpack is available as a direct dependency
    ],
    externals: Object.fromEntries(
      Object.keys(pkg.peerDependencies ?? {}).map((k) => [k, k]),
    ),
    optimization: {
      minimize: isProd,
      usedExports: isProd,
      sideEffects: isProd,
    },
    performance: isProd
      ? { hints: 'warning', maxAssetSize: 512_000, maxEntrypointSize: 512_000 }
      : false,
    stats: isProd ? { preset: 'normal', colors: true } : 'errors-warnings',
  };
}
