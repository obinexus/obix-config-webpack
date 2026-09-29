# obix-config-webpack

> Previous name: `@obinexusltd/obix-config-webpack` — OBIX packages are named without an npm scope since decision D-102 (2026-09-29); the package, its version and its exports are unchanged.

> Webpack 5 bundler configuration for OBIX SDK packages — part of [OBIX](https://github.com/obinexus/obix).

Provides a typed programmatic API, ready-to-use config files, and OBIX-specific plugin utilities for building OBIX SDK packages with Webpack 5+.

---

## Installation

This package is consumed as an npm workspace package. It is registered automatically when you run `npm install` from the monorepo root:

```bash
# From monorepo root
npm install
```

To add it as a dependency in a consumer package inside the monorepo:

```json
{
  "devDependencies": {
    "obix-config-webpack": "workspace:*"
  }
}
```

---

## Package Structure

```
packages/config/webpack/
├── webpack.config.js           ← Base shared config (env-switched via NODE_ENV)
├── development/
│   └── webpack.config.js       ← Dev config (fast rebuilds, eval sourcemaps, HMR-ready)
├── production/
│   └── webpack.config.js       ← Prod config (terser, UMD output, banner, tree-shaking)
├── plugins/
│   ├── obix-define.js          ← OBIX DefinePlugin constants factory
│   └── index.js                ← Barrel re-export
└── src/
    └── index.ts                ← TypeScript programmatic API (compiled to dist/)
```

---

## Programmatic API

Import factory functions from `obix-config-webpack` to build webpack configs in TypeScript or JavaScript:

```ts
import webpack from 'webpack';
import { createDevConfig, createProdConfig, resolveConfig, buildDefines } from 'obix-config-webpack';
import pkg from './package.json' with { type: 'json' };

// Development — fast rebuilds, eval source maps
const devCfg = createDevConfig(pkg);

// Production — UMD output, terser, source maps
const prodCfg = createProdConfig(pkg);

// Resolve by environment string
const cfg = resolveConfig('production', pkg);

// Add DefinePlugin using built-in helper
const withDefines = {
  ...prodCfg,
  plugins: [new webpack.DefinePlugin(buildDefines(pkg, 'production'))],
};

export default cfg;
```

### Factory Functions

| Function | Description |
|----------|-------------|
| `createBaseConfig(pkg, opts?)` | Mode `'none'`, no minification (starting point for custom configs) |
| `createDevConfig(pkg, opts?)` | Mode `development`, eval sourcemaps, `transpileOnly`, HMR-ready |
| `createProdConfig(pkg, opts?)` | Mode `production`, terser, UMD library output, full type-checking |
| `resolveConfig(env, pkg, opts?)` | Delegates to dev or prod based on `env` |
| `buildDefines(pkg, env)` | Returns a `DefinePlugin`-compatible constants object |

### `ObixWebpackOptions`

```ts
interface ObixWebpackOptions {
  entry?: string;        // default: './src/index.ts'
  outDir?: string;       // default: 'dist'
  filename?: string;     // default: 'index.js'
  tsconfig?: string;     // default: './tsconfig.json'
  target?: WebpackTarget; // default: 'web'
  sourcemap?: boolean;   // default: true
  minimize?: boolean;    // default: false (auto true in production)
  libraryName?: string;  // default: 'OBIX' (UMD global name)
}
```

### Static Config Descriptors

Three static objects are exported for obix-cli introspection:

```ts
import { baseConfig, developmentConfig, productionConfig } from 'obix-config-webpack';
```

---

## Using Config Files Directly

### Base config (mode-switched via `NODE_ENV`)

```bash
# Development mode
NODE_ENV=development webpack --config ./node_modules/obix-config-webpack/webpack.config.js

# Production mode
NODE_ENV=production webpack --config ./node_modules/obix-config-webpack/webpack.config.js
```

You can also pass mode explicitly via the webpack CLI:

```bash
webpack --config ./node_modules/obix-config-webpack/webpack.config.js --mode production
```

### Development config

Fast incremental builds using `ts-loader` with `transpileOnly: true`. Run `tsc --noEmit` separately for type validation.

```bash
webpack --config ./node_modules/obix-config-webpack/development/webpack.config.js
```

### Production config

Full type-checking, terser minification, UMD library bundle with banner comment.

```bash
webpack --config ./node_modules/obix-config-webpack/production/webpack.config.js
```

---

## Plugin Utilities

### `createObixDefine(version, env?)`

Creates a `webpack.DefinePlugin`-compatible constants map with OBIX standard substitutions:

| Token | Replaced with |
|-------|--------------|
| `process.env.NODE_ENV` | `"development"` or `"production"` |
| `__OBIX_VERSION__` | Package version string |
| `__DEV__` | `true` in development, `false` in production |

```js
import webpack from 'webpack';
import { createObixDefine } from 'obix-config-webpack/plugins';

plugins: [
  new webpack.DefinePlugin(createObixDefine(pkg.version, 'production')),
]
```

### `createObixDefineWith(version, env?, extra?)`

Same as `createObixDefine` but merges additional custom constants:

```js
plugins: [
  new webpack.DefinePlugin(
    createObixDefineWith(pkg.version, 'production', {
      '__API_URL__': JSON.stringify('https://api.obix.io'),
    })
  ),
]
```

---

## Build Targets

| Target | Use case |
|--------|----------|
| `web` (default) | Browser bundles, CDN delivery |
| `node` | Node.js CLI tools, server-side packages |
| `webworker` | Service Workers, Web Workers |
| `electron-main` | Electron main process |
| `electron-renderer` | Electron renderer process |

---

## Externals Behaviour

| Target | Externalised |
|--------|-------------|
| `web` | `peerDependencies` only |
| `node` | `dependencies` + `peerDependencies` (as `commonjs <name>`) |

---

## Peer Dependencies

This package declares webpack and ts-loader as `peerDependencies`. Install them in the consuming package:

```json
{
  "devDependencies": {
    "ts-loader": "^9.0.0",
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0",
    "terser-webpack-plugin": "^5.0.0"
  }
}
```

Optional extras:

```json
{
  "devDependencies": {
    "webpack-bundle-analyzer": "^4.0.0",
    "html-webpack-plugin": "^5.0.0",
    "mini-css-extract-plugin": "^2.0.0",
    "copy-webpack-plugin": "^12.0.0"
  }
}
```

---

## Comparison with obix-config-rollup

| Feature | `obix-config-rollup` | `obix-config-webpack` |
|---------|---------------------|----------------------|
| Primary use | Library bundling (ESM/CJS/UMD) | Application bundling + library output |
| Tree-shaking | Native (rollup) | `optimization.usedExports` |
| Code splitting | `preserveModules` | `SplitChunksPlugin` |
| Dev server | External (e.g. vite) | `webpack-dev-server` compatible |
| TypeScript | `@rollup/plugin-typescript` | `ts-loader` |
| Best for | SDK packages | Browser apps, complex projects |

---

## Author

**Nnamdi Michael Okpala** — OBINexus &lt;okpalan@protonmail.com&gt;

Part of the [OBIX Heart/Soul UI/UX SDK](https://github.com/obinexus/obix); the source of this package is [github.com/obinexus/obix-config-webpack](https://github.com/obinexus/obix-config-webpack).

<!-- obix-release:begin — generated by scripts/release/prepare.mjs; edit the text above this line -->

## Installation

```bash
npm install obix-config-webpack
```

## API surface

- `obix-config-webpack` — 8 value exports: `baseConfig`, `buildDefines`, `createBaseConfig`, `createDevConfig`, `createProdConfig`, `developmentConfig`, `productionConfig`, `resolveConfig`
- `obix-config-webpack/base` — 1 value export: `default`
- `obix-config-webpack/development` — 1 value export: `default`
- `obix-config-webpack/production` — 1 value export: `default`
- `obix-config-webpack/plugins` — 2 value exports: `createObixDefine`, `createObixDefineWith`
- Type declarations: `./dist/index.d.ts` (and a declaration next to every JS entry point).

## Architecture role

`obix-config-webpack` is a **tool preset**: shared configuration for the tooling of an OBIX project (development-time only).

The architecture of OBIX — the package families and which packages are public API — is indexed in the umbrella: [docs/architecture.md](https://github.com/obinexus/obix/blob/main/docs/architecture.md).

## Package relationships

- Depends on (OBIX): no other OBIX package.
- Used by (OBIX): no other OBIX package.
- Third-party: `terser-webpack-plugin`, `ts-loader`, `webpack`, `webpack-cli`.

## Testing

- 2 test files ship in the npm package (`test/`): the evidence of the package's contract, published so that its verification can be inspected — not runtime code (no entry point reaches them).
- **Standalone**: 2 of 2 — they read nothing outside the package.
- Run them with `npm test` (`node --test "test/*.test.mjs"`) in the OBIX monorepo, which provides the test tooling (Node's test runner, TypeScript) and the harness.

## Documentation

- [CHANGELOG.md](CHANGELOG.md)
- The OBIX architecture index: [obix/docs/architecture.md](https://github.com/obinexus/obix/blob/main/docs/architecture.md)

## Repository

- https://github.com/obinexus/obix-config-webpack — `git@github.com:obinexus/obix-config-webpack.git`
- Issues: https://github.com/obinexus/obix-config-webpack/issues
- The repository is a clean export of the package from the OBIX monorepo. Its lineage — the sources it was recovered from and its earlier names — is `PROVENANCE.json`, shipped in this package; the repository's copy also records the monorepo commit it was exported from.

## License

MIT — see [LICENSE](LICENSE).

<!-- obix-release:end -->
