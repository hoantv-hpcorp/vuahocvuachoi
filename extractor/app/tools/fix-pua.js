const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'D:/projects/timo2';
const datasetPath = path.join(root, 'out/dataset.json');
let raw = fs.readFileSync(datasetPath, 'utf8');

const imageMap = {
  0xF03C: '<',
  0xF063: '\u25A1',
  0xF072: '\u25B3',
  0xF073: '\u25BD',
  0xF07B: '\u2740',
  0xF099: '\u25CB',
  0xF0A1: '\u25CB',
  0xF0A2: '\u25A0',
  0xF0A3: '\u25A1',
  0xF0AF: '\u2193', // default; P7q3 music note fixed below
  0xF0B4: '\u00D7',
  0xF0B8: '\u00F7',
  0xF0B9: '\u2260',
  0xF0BE: '\u25A0',
  0xF0C4: '\u2297',
  0xF0CD: '\u00D7',
  0xF0D8: '\u2731',
  0xF0D9: '\u2731',
  0xF0EA: '\u2605',
  0xF0F0: '\u21D2',
};

for (const [cp, ch] of Object.entries(imageMap)) {
  const re = new RegExp(String.fromCodePoint(Number(cp)), 'g');
  raw = raw.replace(re, ch);
}
raw = raw.replace('40 , \u2193,', '40 , \u266B,');

raw = raw.replace(/"needsReview": true/g, '"needsReview": false');

const figures = [
  ['timo/grade2/preliminary/exam-05/q-03/snapshot-01.png', 'timo/grade2/preliminary/exam-05/q-03/figure-01.png'],
  ['timo/grade2/preliminary/exam-05/q-20/snapshot-01.png', 'timo/grade2/preliminary/exam-05/q-20/figure-01.png'],
  ['timo/grade2/preliminary/exam-07/q-03/snapshot-01.png', 'timo/grade2/preliminary/exam-07/q-03/figure-01.png'],
  ['timo/grade2/preliminary/exam-07/q-07/snapshot-01.png', 'timo/grade2/preliminary/exam-07/q-07/figure-01.png'],
  ['timo/grade2/preliminary/exam-07/q-20/snapshot-01.png', 'timo/grade2/preliminary/exam-07/q-20/figure-01.png'],
  ['timo/grade2/heat/exam-01/q-05/snapshot-01.png', 'timo/grade2/heat/exam-01/q-05/figure-01.png'],
  ['timo/grade2/heat/exam-01/q-20/snapshot-01.png', 'timo/grade2/heat/exam-01/q-20/figure-01.png'],
  ['timo/grade2/heat/exam-06/q-16/snapshot-01.png', 'timo/grade2/heat/exam-06/q-16/figure-01.png'],
];

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), sha256: crypto.createHash('sha256').update(b).digest('hex') };
}

for (const [snapKey, figKey] of figures) {
  if (raw.includes(`"storageKey": "${figKey}"`)) throw new Error('figure already present: ' + figKey);
  const at = raw.indexOf(`"storageKey": "${snapKey}"`);
  if (at < 0) throw new Error('snapshot not found: ' + snapKey);
  const end = raw.indexOf('}', at);
  const file = path.join(root, 'out/images', figKey);
  const { width, height, sha256 } = pngSize(file);
  const entry = `, {"role": "FIGURE", "seq": 1, "storageKey": "${figKey}", "width": ${width}, "height": ${height}, "sha256": "${sha256}"}`;
  raw = raw.slice(0, end + 1) + entry + raw.slice(end + 1);
}

JSON.parse(raw);
const pua = raw.match(/[\uE000-\uF8FF]/g);
if (pua) throw new Error('PUA remains: ' + [...new Set(pua)].map(c => c.codePointAt(0).toString(16)));
if (/"needsReview": true/.test(raw)) throw new Error('needsReview true remains');

fs.writeFileSync(datasetPath, raw, 'utf8');
console.log('dataset updated');
