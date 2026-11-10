// Starts the original KING MD bot engine and the HTTP pairing bridge together.
const { spawn } = require('child_process');
const path = require('path');
const children = [];
function start(file, label, extraEnv = {}) {
  const child = spawn(process.execPath, [path.join(__dirname, file)], {
    cwd: __dirname,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit'
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    console.error(`[KING MD] ${label} exited (code=${code}, signal=${signal || 'none'}).`);
    if (!shuttingDown) shutdown(code || 1);
  });
}
let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch (_) {}
  }
  setTimeout(() => process.exit(code || 0), 1500).unref();
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
start('index.js', 'Bot engine', { PORT: '10002' });
start('pairing-server.js', 'Pairing API');
