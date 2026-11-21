#!/usr/bin/env node
/**
 * build-core.mjs — build `packages/core-rust` for the web runtime.
 *
 * 1. `cargo build --release --target wasm32-unknown-unknown`
 * 2. `wasm-bindgen --target web` into `packages/runtime-web/wasm`
 *
 * Artifacts are gitignored. A missing toolchain is a hard failure: the web
 * runtime MUST NOT fall back to a TypeScript crypto implementation.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, readdirSync, copyFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CRATE = join(ROOT, 'packages', 'core-rust');
const OUT_DIR = join(ROOT, 'packages', 'runtime-web', 'wasm');
const PUBLIC_DIR = join(ROOT, 'apps', 'studio-web', 'public', 'wasm');
const TARGET = 'wasm32-unknown-unknown';
const WASM_NAME = 'microapp_core.wasm';

/**
 * Exports `packages/runtime-web/src/loader/wasm.ts` requires. The loader fails
 * closed when one is missing, so the build checks the generated bindings here
 * instead of leaving the failure to a browser at runtime.
 */
const REQUIRED_EXPORTS = [
  'identity_create',
  'identity_recover',
  'identity_public',
  'identity_sign_message',
  'envelope_seal_js',
  'envelope_open_js',
  'manifest_validate',
  'mapp_prepare_v2',
  'mapp_finalize_v2',
  'mapp_verify_v2',
  'mapp_extract_entries',
  'audit_hash_js',
  'hlc_tick',
  'guard_check_sql',
  'guard_check_path',
  'guard_check_domain',
  'sha256_hex',
  'mnemonic_validate',
  'device_cert_create',
  'vault_seal',
  'vault_open',
  'ed25519_sign_seed',
  'ed25519_public_seed',
  'vault_key_wrap',
  'vault_verify_wrap',
  'vault_seal_wrapped',
  'vault_open_wrapped',
  'backup_seal_v2',
  'backup_open_v2',
  'json_jcs_sha256',
];

function run(cmd, args, options = {}) {
  process.stdout.write(`$ ${cmd} ${args.join(' ')}\n`);
  execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...options });
}

function which(binary) {
  try {
    execFileSync(binary, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!which('cargo')) {
  console.error('build:core requires `cargo` (Rust toolchain).');
  process.exit(1);
}

try {
  run('cargo', ['build', '--release', '--target', TARGET, '--manifest-path', join(CRATE, 'Cargo.toml')]);
} catch (error) {
  console.error('cargo build failed. Ensure `rustup target add wasm32-unknown-unknown` has run.');
  process.exit(error?.status ?? 1);
}

const wasmPath = join(CRATE, 'target', TARGET, 'release', WASM_NAME);
if (!existsSync(wasmPath)) {
  console.error(`missing wasm artifact: ${wasmPath}`);
  process.exit(1);
}

if (!which('wasm-bindgen')) {
  console.error(
    'build:core requires `wasm-bindgen-cli`. Install the version matching Cargo.lock:\n' +
      '  cargo install wasm-bindgen-cli --version 0.2.130',
  );
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
run('wasm-bindgen', ['--target', 'web', '--out-dir', OUT_DIR, '--out-name', 'microapp_core', wasmPath]);

const produced = readdirSync(OUT_DIR).filter((name) => !name.startsWith('.'));
for (const name of ['microapp_core.js', 'microapp_core_bg.wasm', 'microapp_core.d.ts']) {
  const path = join(OUT_DIR, name);
  if (!existsSync(path)) {
    console.error(`wasm-bindgen did not produce ${name}`);
    process.exit(1);
  }
  process.stdout.write(`${name}: ${statSync(path).size} bytes\n`);
}
const declarations = readFileSync(join(OUT_DIR, 'microapp_core.d.ts'), 'utf8');
const missing = REQUIRED_EXPORTS.filter(
  (name) => !new RegExp(`export function ${name}\\s*\\(`).test(declarations),
);
if (missing.length > 0) {
  console.error(`wasm-bindgen output is missing required exports: ${missing.join(', ')}`);
  process.exit(1);
}
process.stdout.write(`verified ${REQUIRED_EXPORTS.length} required exports\n`);

// Publish the bindings for the host worker/iframe (static assets, gitignored).
mkdirSync(PUBLIC_DIR, { recursive: true });
for (const name of produced) {
  copyFileSync(join(OUT_DIR, name), join(PUBLIC_DIR, name));
}
process.stdout.write(`core wasm ready in ${OUT_DIR} and ${PUBLIC_DIR} (${produced.length} files)\n`);
