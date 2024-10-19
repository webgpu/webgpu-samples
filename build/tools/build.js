import { mkdirSync } from 'fs';
import { spawnAndCheck } from '../lib/spawn.js';

mkdirSync('out', { recursive: true });

spawnAndCheck('node', ['build/tools/copy.js'], {
  shell: true,
  stdio: 'inherit',
});

spawnAndCheck('./node_modules/.bin/rollup', ['-c'], {
  shell: true,
  stdio: 'inherit',
});
