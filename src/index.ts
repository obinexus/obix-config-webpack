// obix-config-webpack
// Programmatic webpack configuration factory for OBIX SDK packages.
// NOTE: This module does NOT import webpack at compile time — webpack stays a
// peerDependency consumed at runtime. All config objects are plain objects
// matching webpack's Configuration shape via structural typing.

// ─── Types ────────────────────────────────────────────────────────────────────

/** Webpack build mode */
export type WebpackMode = 'development' | 'production' | 'none';

/** Build environment alias */
export type WebpackEnv = 'development' | 'production';

/** Supported output library targets */
export type WebpackTarget =
  | 'web'
  | 'node'
  | 'electron-main'
  | 'electron-renderer'
  | 'webworker';

/** Minimal package.json metadata needed to stamp version and derive externals */
export interface PackageMeta {
  name?: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** Options accepted by all factory functions */
export interface ObixWebpackOptions {
  /** Entry point. Default: `'./src/index.ts'` */
  entry?: string;
  /** Output directory. Default: `'dist'` */
  outDir?: string;
  /** Output bundle filename. Default: `'index.js'` */
  filename?: string;
  /** Path to tsconfig.json for ts-loader. Default: `'./tsconfig.json'` */
  tsconfig?: string;
  /** Webpack build target. Default: `'web'` */
  target?: WebpackTarget;
  /** Emit source maps. Default: `true` */
  sourcemap?: boolean;
  /** Apply terser minimisation. Default: `false` (auto-`true` in production) */
  minimize?: boolean;
  /** Library name for UMD/global exports. Default: `'OBIX'` */
  libraryName?: string;
}

/** Fully-resolved options — all fields present */
export type ResolvedObixWebpackOptions = Required<ObixWebpackOptions>;

/** Static descriptor used by obix-cli to introspect the config package */
export interface ObixWebpackConfig {
  env: WebpackEnv;
  mode: WebpackMode;
  options: ResolvedObixWebpackOptions;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: ResolvedObixWebpackOptions = {
  entry: './src/index.ts',
  outDir: 'dist',
  filename: 'index.js',
  tsconfig: './tsconfig.json',
  target: 'web',
  sourcemap: true,
  minimize: false,
  libraryName: 'OBIX',
};

function resolveOptions(overrides?: ObixWebpackOptions): ResolvedObixWebpackOptions {
  return { ...DEFAULT_OPTIONS, ...overrides };
}

// ─── Static descriptors (for obix-cli indexing) ───────────────────────────────

export const baseConfig: ObixWebpackConfig = {
  env: 'development',
  mode: 'none',
  options: { ...DEFAULT_OPTIONS },
};

export const developmentConfig: ObixWebpackConfig = {
  env: 'development',
  mode: 'development',
  options: {
    ...DEFAULT_OPTIONS,
    sourcemap: true,
    minimize: false,
  },
};

export const productionConfig: ObixWebpackConfig = {
  env: 'production',
  mode: 'production',
  options: {
    ...DEFAULT_OPTIONS,
    sourcemap: true,
    minimize: true,
  },
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Build the DefinePlugin constants object with OBIX standard substitutions.
 * Pass this directly to `new webpack.DefinePlugin(buildDefines(...))`.
 */
export function buildDefines(
  pkg: PackageMeta,
  env: WebpackEnv,
): Record<string, string> {
  return {
    'process.env.NODE_ENV': JSON.stringify(env),
    '__OBIX_VERSION__': JSON.stringify(pkg.version),
    '__DEV__': JSON.stringify(env !== 'production'),
  };
}

/**
 * Derive webpack externals from the package's dependency lists.
 * In 'web' target builds we do not externalise deps.
 * In 'node' target builds we externalise all deps + peerDeps.
 */
function buildExternals(
  pkg: PackageMeta,
  target: WebpackTarget,
): Record<string, string> {
  if (target === 'node') {
    const all = {
      ...pkg.dependencies,
      ...pkg.peerDependencies,
    };
    return Object.fromEntries(
      Object.keys(all).map((k) => [k, `commonjs ${k}`]),
    );
  }
  // For web/browser targets, only externalise peerDependencies
  return Object.fromEntries(
    Object.keys(pkg.peerDependencies ?? {}).map((k) => [k, k]),
  );
}

// ─── Factory functions ─────────────────────────────────────────────────────────

/**
 * Create a base webpack configuration object.
 * Mode is `'none'` — consumers set it explicitly or switch via env.
 * Suitable as a starting point for custom configurations.
 */
export function createBaseConfig(
  pkg: PackageMeta,
  options?: ObixWebpackOptions,
): Record<string, unknown> {
  const opts = resolveOptions(options);
  return {
    mode: 'none',
    entry: opts.entry,
    output: {
      path: opts.outDir,
      filename: opts.filename,
      clean: true,
    },
    target: opts.target,
    devtool: opts.sourcemap ? 'source-map' : false,
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
              options: { configFile: opts.tsconfig, transpileOnly: false },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    // DefinePlugin constants — consumer instantiates: new webpack.DefinePlugin(defines)
    _defines: buildDefines(pkg, 'development'),
    externals: buildExternals(pkg, opts.target),
    optimization: { minimize: opts.minimize },
  };
}

/**
 * Create a development webpack configuration object.
 * Mode: `development`, fast rebuilds, eval source maps, HMR-ready.
 */
export function createDevConfig(
  pkg: PackageMeta,
  options?: ObixWebpackOptions,
): Record<string, unknown> {
  const opts = resolveOptions({ sourcemap: true, minimize: false, ...options });
  return {
    mode: 'development',
    entry: opts.entry,
    output: {
      path: opts.outDir,
      filename: opts.filename,
      clean: true,
    },
    target: opts.target,
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
                configFile: opts.tsconfig,
                transpileOnly: true,
                experimentalWatchApi: true,
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    _defines: buildDefines(pkg, 'development'),
    externals: buildExternals(pkg, opts.target),
    optimization: {
      minimize: false,
      runtimeChunk: 'single',
    },
    stats: 'errors-warnings',
  };
}

/**
 * Create a production webpack configuration object.
 * Mode: `production`, terser minification, source maps, tree-shaking enabled.
 */
export function createProdConfig(
  pkg: PackageMeta,
  options?: ObixWebpackOptions,
): Record<string, unknown> {
  const opts = resolveOptions({ sourcemap: true, minimize: true, ...options });
  return {
    mode: 'production',
    entry: opts.entry,
    output: {
      path: opts.outDir,
      filename: opts.filename,
      library: {
        name: opts.libraryName,
        type: 'umd',
        export: 'default',
      },
      globalObject: 'globalThis',
      clean: true,
    },
    target: opts.target,
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
              options: { configFile: opts.tsconfig, transpileOnly: false },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    _defines: buildDefines(pkg, 'production'),
    externals: buildExternals(pkg, opts.target),
    optimization: {
      minimize: true,
      // TerserPlugin is webpack's built-in; no import needed
      usedExports: true,
      sideEffects: true,
    },
    performance: {
      hints: 'warning',
      maxAssetSize: 512_000,
      maxEntrypointSize: 512_000,
    },
    stats: { preset: 'normal', colors: true },
  };
}

/**
 * Resolve a webpack configuration by environment name.
 * Delegates to `createDevConfig` or `createProdConfig` based on `env`.
 */
export function resolveConfig(
  env: WebpackEnv,
  pkg: PackageMeta,
  options?: ObixWebpackOptions,
): Record<string, unknown> {
  return env === 'production'
    ? createProdConfig(pkg, options)
    : createDevConfig(pkg, options);
}
