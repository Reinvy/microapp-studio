/**
 * `@microapp/runtime-web` — sandbox runtime for the web host.
 *
 * Public surface: bridge protocol/broker/rate limit, MUIP validation and
 * rendering, opaque-origin sandbox helpers, watchdog, lifecycle, and the `.mapp`
 * loader.
 */

export * from './bridge/errors';
export * from './bridge/protocol';
export * from './bridge/rate-limit';
export * from './bridge/broker';
export * from './muip/catalog.generated';
export * from './muip/props';
export * from './muip/validate';
export * from './muip/renderer';
export * from './sandbox/watchdog';
export * from './sandbox/lifecycle';
export * from './sandbox/iframe-doc';
export * from './loader/mapp';
export * from './loader/wasm';
export * from './types/guards';
