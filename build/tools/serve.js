import { spawn } from 'child_process';
import { mkdirSync } from 'fs';

mkdirSync('out', { recursive: true });

const spawns = [];

function spawnAndCheck(cmd, args, options) {
  const s = spawn(cmd, args, options);
  spawns.push(s);
  s.on('close', (code) => {
    console.log(cmd, 'exited with code:', code);
    spawns.forEach((s) => s.kill());
    process.exit(code);
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
