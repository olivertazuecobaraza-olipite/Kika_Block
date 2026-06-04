import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'amd/src/lib.js',
    output: {
        file: 'amd/build/lib.min.js',
        format: 'amd',
        amd: {
            id: 'block_kika_chat/lib',
        },
    },
    plugins: [
        resolve(),
        commonjs(),
    ],
};
