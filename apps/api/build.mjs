// Bundles the API into a single dist/index.mjs that runs without node_modules.
import { createRequire } from 'node:module';
import path from 'node:path';
import { rm } from 'node:fs/promises';
import { build } from 'esbuild';
import esbuildPluginPino from 'esbuild-plugin-pino';

// esbuild-plugin-pino resolves pino's workers with require.
globalThis.require = createRequire(import.meta.url);

const root = import.meta.dirname;
const outdir = path.resolve(root, 'dist');
await rm(outdir, { recursive: true, force: true });

await build({
  entryPoints: [path.resolve(root, 'src/index.ts')],
  platform: 'node',
  bundle: true,
  format: 'esm',
  outdir,
  outExtension: { '.js': '.mjs' },
  logLevel: 'info',
  sourcemap: 'linked',
  // pg tries to load pg-native optionally; native addons can't be bundled.
  external: ['*.node', 'pg-native'],
  plugins: [esbuildPluginPino({ transports: ['pino-pretty'] })],
  // Lets bundled CommonJS packages (express, pg…) use require and __dirname.
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "import __path from 'node:path';",
      "import __url from 'node:url';",
      'globalThis.require = __createRequire(import.meta.url);',
      'globalThis.__filename = __url.fileURLToPath(import.meta.url);',
      'globalThis.__dirname = __path.dirname(globalThis.__filename);',
    ].join('\n'),
  },
});
