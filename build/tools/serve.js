import { spawn } from 'child_process';
import { mkdirSync } from 'fs';

mkdirSync('out', { recursive: true });

const spawns = new Set();

function spawnAndCheck(cmd, args, options) {
  const s = spawn(cmd, args, options);
  spawns.add(s);
  s.on('close', (code) => {
    spawns.delete(s);
    if (code !== 0) {
      console.error(cmd, 'exited with code:', code);
      [...spawns].forEach((s) => s.kill());
      process.exit(code);
    }
  });
}

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
