'use strict';

// Apply small, guarded fixes to the existing engine instead of maintaining a
// second copy of its large main.js. This runs before every engine start and is
// safe to run repeatedly.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'main.js');
let source = fs.readFileSync(file, 'utf8');

function replaceOnceOrAssert(before, after, label) {
  const count = source.split(before).length - 1;
  if (count === 1) {
    source = source.replace(before, after);
    return;
  }
  if (count === 0 && source.includes(after)) return; // already patched
  throw new Error(`[KING MD] Expected one ${label} source fragment, found ${count}; refusing to start.`);
}

replaceOnceOrAssert(
  `function makeKingCode() {\n  const d1 = crypto.randomInt(0, 10);\n  let d2 = crypto.randomInt(0, 10);\n  while (d1 === d2) d2 = crypto.randomInt(0, 10);\n  return \`KINGMD${d1}${d2}\`;\n}\n`,
  '',
  'fake pairing-code generator'
);
replaceOnceOrAssert('entry.kingCode = makeKingCode();', 'entry.kingCode = entry.code;', 'new-session pairing code');
replaceOnceOrAssert('if (!cur.kingCode) cur.kingCode = makeKingCode();', 'if (!cur.kingCode) cur.kingCode = cur.code;', 'cached-session pairing code');

const legacyFields = 'kingCode: r.kingCode, kingMdCode: r.kingCode, displayCode: r.kingCode';
const realFields = 'kingCode: r.code, kingMdCode: r.code, displayCode: r.code';
const legacyCount = source.split(legacyFields).length - 1;
if (legacyCount) source = source.split(legacyFields).join(realFields);
else if (!source.includes(realFields)) throw new Error('[KING MD] Pairing response aliases were not found; refusing to start.');

replaceOnceOrAssert(
  'const msg = message?.message || {};',
  'const raw = message?.message || {};\n  const msg = (typeof baileys.normalizeMessageContent === \'function\' && baileys.normalizeMessageContent(raw)) || raw;',
  'message-content normalization'
);

const warmupMarker = '\nfunction getMessageText(message) {';
const warmupBlock = `\n// Warm command modules after startup so the first post-pair command does not pay lazy-load costs.\nif (!source.includes('[KING MD] Command warmup complete')) {\n  source = source.replace(warmupMarker, \`\nsetImmediate(() => {\n  let loaded = 0;\n  for (const name of commandFiles.keys()) {\n    try { if (getCommandHandler(name)) loaded++; }\n    catch (error) { console.error('[KING MD] Command warmup failed:', name, error.message); }\n  }\n  console.log(\'[KING MD] Command warmup complete: \' + loaded + \'/\' + commandFiles.size + \' handlers ready\');\n});\nfunction getMessageText(message) {\`);\n}\n`;
if (!source.includes('[KING MD] Command warmup complete')) {
  if (!source.includes(warmupMarker)) throw new Error('[KING MD] Command warmup insertion point was not found; refusing to start.');
  // Insert actual engine code at the point where all command-loader functions exist.
  const actualWarmup = `\n// Warm command modules after startup so the first post-pair command does not pay lazy-load costs.\nsetImmediate(() => {\n  let loaded = 0;\n  for (const name of commandFiles.keys()) {\n    try { if (getCommandHandler(name)) loaded++; }\n    catch (error) { console.error('[KING MD] Command warmup failed:', name, error.message); }\n  }\n  console.log('[KING MD] Command warmup complete: ' + loaded + '/' + commandFiles.size + ' handlers ready');\n});\nfunction getMessageText(message) {`;
  source = source.replace(warmupMarker, actualWarmup);
}

source = source.replace(', makeKingCode, makeManagePassword', ', makeManagePassword');
fs.writeFileSync(file, source);
console.log('[KING MD] Startup fixes applied: real pairing codes, normalized messages, and warmed command handlers.');
