import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const debug = console.log; //() => {};
const removeLeadingSlash = (s) => s.replace(/^\//, '');

/**
 * Recursively copies files and watches for changes.
 *
 * Example:
 *
 *    copyAndWatch([
 *      {src: "src\/**\/*.js", srcPrefix: "src", dst: "out"},   // would copy src/bar/moo.js -> out/bar/moo.js
 *      {src: "index.html", dst: "out"},                        // copies index.html -> out/index.html
 *    ]);
 *
 * @param {*} paths [{src: glob, srcPrefix: string, dst: string }]
 * @param {*} options { watch: true/false }  // watch: false = just copy and exit.
 */
export function copyAndWatch(paths, { watch } = { watch: true }) {
  for (const { src, srcPrefix, dst } of paths) {
    const watcher = chokidar.watch(globSync(src), {
      ignored: /(^|[\/\\])\../, // ignore dot files
      persistent: watch,
    });

    const makeDstPath = (path, dst) =>
      `${dst}/${removeLeadingSlash(
        path.startsWith(srcPrefix) ? path.substring(srcPrefix.length) : path
      )}`;

    watcher
      .on('addDir', (srcPath) => {
        const dstPath = makeDstPath(srcPath, dst);
        debug('addDir:', srcPath, dstPath);
        fs.mkdirSync(dstPath, { recursive: true });
      })
      .on('add', (srcPath) => {
        const dstPath = makeDstPath(srcPath, dst);
        const dir = path.dirname(dstPath);
        fs.mkdirSync(dir, { recursive: true });
        debug('add:', srcPath, dstPath);
        fs.copyFileSync(srcPath, dstPath);
      })
      .on('change', (srcPath) => {
        const dstPath = makeDstPath(srcPath, dst);
        debug('change:', srcPath, dstPath);
        fs.copyFileSync(srcPath, dstPath);
      })
      .on('unlink', (srcPath) => {
        const dstPath = makeDstPath(srcPath, dst);
        debug('unlink:', srcPath, dstPath);
        fs.unlinkSync(dstPath);
      })
      .on('ready', () => {
        if (!watch) {
          watcher.close();
        }
      });
  }
}
