import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import banner from 'rollup-plugin-banner';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  // CLI executable
  {
    input: 'src/cli.ts',
    output: {
      file: 'dist/cli.js',
      format: 'es',
      banner: '#!/usr/bin/env node'
    },
    external: [
      'commander',
      'chalk',
      'ora',
      'inquirer',
      'axios',
      'ws',
      'express',
      'socket.io',
      'socket.io-client',
      'pg',
      'redis',
      'dotenv',
      'yaml',
      'fs-extra',
      'glob',
      'minimatch',
      'semver',
      'node-fetch',
      'uuid',
      'jsonwebtoken',
      'bcryptjs',
      'helmet',
      'cors',
      'winston',
      'joi',
      'open'
    ],
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      }),
      ...(isProduction ? [terser()] : []),
      banner({
        file: 'LICENSE',
        encoding: 'utf-8'
      })
    ]
  },
  // Main library entry
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es'
    },
    external: [
      'commander',
      'chalk',
      'ora',
      'inquirer',
      'axios',
      'ws',
      'express',
      'socket.io',
      'socket.io-client',
      'pg',
      'redis',
      'dotenv',
      'yaml',
      'fs-extra',
      'glob',
      'minimatch',
      'semver',
      'node-fetch',
      'uuid',
      'jsonwebtoken',
      'bcryptjs',
      'helmet',
      'cors',
      'winston',
      'joi',
      'open'
    ],
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationMap: true,
        outDir: 'dist'
      }),
      ...(isProduction ? [terser()] : [])
    ]
  }
];