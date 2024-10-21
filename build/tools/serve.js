import { mkdirSync } from 'fs';
import { spawnAndCheck } from '../lib/spawn.js';

mkdirSync('out', { recursive: true });

spawnAndCheck('npm', ['run', 'watch'], {
  shell: true,
  stdio: 'inherit',
});

spawnAndCheck('node', ['build/tools/copy.js', '1'], {
  shell: true,
  stdio: 'inherit',
});

spawnAndCheck('npm', ['run', 'server'], {
  shell: true,
  stdio: 'inherit',
});
