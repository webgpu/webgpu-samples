import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs'

export default {
  input: 'utils.js',
  output: {
    name: 'Utils',
    file: 'dist/utils.js',
    format: 'umd',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    commonJS({
      include: 'node_modules/**'
    })
  ]
};
