// obix-config-webpack/plugins — obix-define
// Factory that creates a standard webpack DefinePlugin constants map
// pre-configured with OBIX SDK substitutions.
//
// Usage in a consumer's webpack.config.js:
//   import webpack from 'webpack';
//   import { createObixDefine } from 'obix-config-webpack/plugins';
//
//   plugins: [ new webpack.DefinePlugin(createObixDefine(pkg.version, 'production')) ]

/**
 * Build a webpack `DefinePlugin`-compatible constants object with OBIX defaults.
 *
 * @param {string} version      - Package version string (e.g. '0.1.0')
 * @param {'development'|'production'} [env='development'] - Build environment
 * @returns {Record<string, string>}
 */
export function createObixDefine(version, env = 'development') {
  return {
    /** Replaced by the NODE_ENV string literal */
    'process.env.NODE_ENV': JSON.stringify(env),
    /** Replaced by the package version string literal */
    '__OBIX_VERSION__': JSON.stringify(version),
    /** Replaced by a boolean literal: true in development, false in production */
    '__DEV__': JSON.stringify(env !== 'production'),
  };
}

/**
 * Extended define factory that merges additional user-defined constants.
 *
 * @param {string} version
 * @param {'development'|'production'} [env='development']
 * @param {Record<string, string>} [extra={}] - Additional `key: JSON.stringify(value)` constants
 * @returns {Record<string, string>}
 */
export function createObixDefineWith(version, env = 'development', extra = {}) {
  return {
    ...createObixDefine(version, env),
    ...extra,
  };
}
