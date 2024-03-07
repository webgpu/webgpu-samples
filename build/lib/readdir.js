import fs from 'fs';
import path from 'path';

// not needed in node v20+
export function readDirSyncRecursive(dir) {
  const basename = path.basename(dir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .map((entry) =>
      entry.isDirectory()
        ? readDirSyncRecursive(`${dir}/${entry.name}`)
        : entry.name
    )
    .flat()
    .map((name) => `${basename}/${name}`);
}
