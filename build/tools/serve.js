import { spawn } from 'child_process';
import { mkdirSync } from 'fs';

mkdirSync('out', { recursive: true });

spawn('npm', ['run', 'watch'], {
  shell: true,
  stdio: 'inherit',
});

spawn('node', ['build/tools/copy.js', '1'], {
  shell: true,
  stdio: 'inherit',
});

spawn('npm', ['run', 'server'], {
  shell: true,
  stdio: 'inherit',
});
