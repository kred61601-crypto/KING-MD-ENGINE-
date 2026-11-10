// Run the original KING MD bot and the dedicated pairing API as separate processes.
const { spawn } = require('child_process');
const path = require('path');
const bot = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
  cwd: __dirname,
  env: { ...process.env, PORT: '10002' },
  stdio: 'inherit'
});
bot.on('exit', code => { console.error('Original bot process exited with code', code); });
require('./pairing-api');
