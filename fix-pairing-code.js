'use strict';

// The engine's main.js has a legacy display-code generator. Patch those exact
// source fragments before startup so every API code field is the real code
// returned by WhatsApp's requestPairingCode(). Fail closed if source changes.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'main.js');
let source = fs.readFileSync(file, 'utf8');

function replaceExactlyOnce(before, after, label) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Pairing-code safety patch expected one ${label} occurrence; found ${occurrences}. Refusing to start.`);
  }
  source = source.replace(before, after);
}

replaceExactlyOnce(
  `function makeKingCode() {\n  const d1 = crypto.randomInt(0, 10);\n  let d2 = crypto.randomInt(0, 10);\n  while (d1 === d2) d2 = crypto.randomInt(0, 10);\n  return \`KINGMD${d1}${d2}\`;\n}\n`,
  '',
  'fake code generator'
);
replaceExactlyOnce('entry.kingCode = makeKingCode();', 'entry.kingCode = entry.code;', 'new-session display code');
replaceExactlyOnce('if (!cur.kingCode) cur.kingCode = makeKingCode();', 'if (!cur.kingCode) cur.kingCode = cur.code;', 'cached-session display code');
replaceExactlyOnce(', makeKingCode, makeManagePassword', ', makeManagePassword', 'module export');

fs.writeFileSync(file, source);
console.log('[KING MD] Pairing-code safety patch applied: display fields now use WhatsApp’s real code.');
