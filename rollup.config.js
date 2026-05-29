import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'blocks/kika_chat/amd/src/lib.js', // Ruta del archivo fuente
    output: {
        file: 'blocks/kika_chat/amd/build/lib.min.js', // Archivo de salida
        format: 'iife', // Formato: Immediately Invoked Function Expression
        name: 'kikachatBlock', // Nombre global (opcional)
    },
    plugins: [
        resolve(), // Soporte para módulos node_modules
        commonjs(), // Soporte para módulos CommonJS
    ],
};
