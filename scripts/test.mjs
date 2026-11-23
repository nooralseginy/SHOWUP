import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = mkdtempSync(join(tmpdir(), 'showup-tests-'));
let status = 1;
try {
  const compile = spawnSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', 'tsconfig.test.json', '--outDir', output], { stdio: 'inherit' });
  if (compile.status === 0) {
    const files = readdirSync(join(output, 'tests')).filter(file => file.endsWith('.test.js')).map(file => join(output, 'tests', file));
    status = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' }).status ?? 1;
  }
} finally { rmSync(output, { recursive: true, force: true }); }
process.exitCode = status;
