import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { importModule, packageDir, presetExports } from './support/preset-contract.mjs';

const dir = packageDir(import.meta.url);
const exportsMap = Object.fromEntries(presetExports(dir));
const pkg = { name: 'sample', version: '1.2.3' };

test('the base preset can be imported on Node (upstream imported a non-existent node:url export and threw a SyntaxError)', async () => {
  const { default: build } = await importModule(exportsMap['./base']);
  assert.equal(typeof build, 'function', 'the base preset is an (env, argv) => configuration function');
  const cfg = build({}, {});
  assert.equal(typeof cfg, 'object');
  assert.equal(typeof cfg.mode, 'string');
});

test('the production preset loads under strict dependency resolution (upstream imported terser-webpack-plugin without declaring it)', async () => {
  const { default: cfg } = await importModule(exportsMap['./production']);
  assert.ok(cfg.optimization && Array.isArray(cfg.optimization.minimizer) && cfg.optimization.minimizer.length > 0, 'terser minimizer configured');
});

test('development and production presets load and differ in mode', async () => {
  const dev = (await importModule(exportsMap['./development'])).default;
  const prod = (await importModule(exportsMap['./production'])).default;
  assert.equal(dev.mode, 'development');
  assert.equal(prod.mode, 'production');
});

test('programmatic factories need package metadata and stamp its version', async () => {
  const api = await importModule(path.join(dir, 'dist', 'index.js'));
  const base = api.createBaseConfig(pkg);
  assert.equal(typeof base, 'object');
  assert.ok(Array.isArray(base.module.rules) && base.module.rules.length > 0, 'ts-loader rule');
  assert.equal(api.buildDefines(pkg).__OBIX_VERSION__, JSON.stringify('1.2.3'));
  assert.equal(api.createDevConfig(pkg).mode, 'development');
  assert.equal(api.createProdConfig(pkg).mode, 'production');
  assert.equal(typeof api.resolveConfig('development', pkg), 'object');
});

test('the ./plugins export builds DefinePlugin instances', async () => {
  const { createObixDefine } = await importModule(exportsMap['./plugins']);
  assert.equal(typeof createObixDefine, 'function');
});
