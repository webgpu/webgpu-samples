import { spawn } from 'child_process';

const spawns = new Set();

export function spawnAndCheck(cmd, args, options) {
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
