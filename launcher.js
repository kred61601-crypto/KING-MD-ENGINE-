'use strict';

/**
 * Launcher for the readable KING MD app.
 *
 * Instead of starting the old obfuscated entry file, this launcher starts
 * the normal readable bot entry point in main.js.
 */

const { spawn } = require('child_process');
const path = require('path');

const bot = spawn(process.execPath, [path.join(__dirname, 'main.js')], {
  cwd: __dirname,
  env: { ...process.env, PORT: process.env.PORT || '10000' },
  stdio: 'inherit'
});

bot.on('exit', code => {
  console.error('[KING MD] Bot process exited with code', code);
});

console.log('[KING MD] Launcher is running. main.js is the active bot entry point.');
