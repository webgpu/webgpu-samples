import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { readDirSyncRecursive } from './build/lib/readdir.js';

function wgslPlugin() {
  return {
    name: 'wgsl-plugin',
    transform(code, id) {
      if (id.endsWith('.wgsl')) {
        return {
          code: `export default \`${code}\`;`,
          map: { mappings: '' } 
        };
      }
    }
  };
}

const samplePlugins = [
    wgslPlugin(),
    nodeResolve(),
    commonjs(),
    typescript({ tsconfig: './sample/tsconfig.json' }),
];

// add a rollup rule for each sample
const samples = readDirSyncRecursive('sample')
    .filter(n => n.endsWith('/main.ts') || n.endsWith('/worker.ts'))
    .map(filename => {
        return {
            input: filename,
            output: [
                {
                    file: `out/${filename.replace(/\.ts$/, '.js')}`,
                    format: 'esm',
                    sourcemap: true
                }
            ],
            plugins: samplePlugins,
        };
    });

export default [
    {
        input: 'src/main.ts',
        output: [
            {
                file: `out/main.js`,
                format: 'esm',
                sourcemap: true,
            },
        ],
        plugins: [
            nodeResolve(),
            typescript({ tsconfig: './src/tsconfig.json' }),
        ],
        watch: {
            clearScreen: false,
        },
    },
    ...samples,
];
