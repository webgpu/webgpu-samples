import { copyAndWatch } from '../lib/copyAndWatch.js';

const watch = !!process.argv[2];

copyAndWatch(
  [
    { src: 'public/**/*', srcPrefix: 'public', dst: 'out' },
    { src: 'meshes/**/*', dst: 'out' },
    { src: 'sample/**/*', dst: 'out' },
    { src: 'samples/**/*', dst: 'out' },
    { src: 'shaders/**/*', dst: 'out' },
    { src: 'index.html', dst: 'out' },
  ],
  { watch }
);
