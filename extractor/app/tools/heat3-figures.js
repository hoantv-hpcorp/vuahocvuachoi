const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'D:/projects/timo2';
const datasetPath = path.join(root, 'out/dataset.json');
let raw = fs.readFileSync(datasetPath, 'utf8');
const original = raw;

const exam = 'timo/grade2/heat/exam-03';

const textEdits = [
  ['q-03', 'Table: Bảng.\\n5 3 15\\n4 5 20\\n3 7 ？\\n2 9 18\\n', 'Table: Bảng.\\n'],
  ['q-04', 'Space: Chỗ trống.\\nD 、 G 、 I 、 L 、 N 、 __\\n', 'Space: Chỗ trống.\\n'],
  ['q-08', 'Correct: Đúng.\\nB\\n+ B A\\n5 3\\n', 'Correct: Đúng.\\n'],
  ['q-13', '8th number: Số thứ 8.\\n96、89、82、75、…\\n', '8th number: Số thứ 8.\\n'],
  ['q-15', '\\n17      9      6      12  =  14\\n', '\\n'],
  ['q-25', 'Between: Ở giữa.\\n99 ÷ 3,   19×2,   51÷ 3,   6×8,   24×3,   5×5,   62 ÷ 2\\n', 'Between: Ở giữa.\\n'],
];

for (const [q, oldText, newText] of textEdits) {
  const count = raw.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${q}: expected 1 text match, found ${count}`);
  raw = raw.replace(oldText, newText);
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    sha256: crypto.createHash('sha256').update(b).digest('hex'),
  };
}

for (const q of ['q-03', 'q-04', 'q-08', 'q-13', 'q-15', 'q-25']) {
  const snapKey = `${exam}/${q}/snapshot-01.png`;
  const figKey = `${exam}/${q}/figure-01.png`;
  if (raw.includes(`"storageKey": "${figKey}"`)) throw new Error('figure already present: ' + figKey);
  const at = raw.indexOf(`"storageKey": "${snapKey}"`);
  if (at < 0) throw new Error('snapshot not found: ' + snapKey);
  const end = raw.indexOf('}', at);
  const { width, height, sha256 } = pngSize(path.join(root, 'out/images', figKey));
  const entry = `, {"role": "FIGURE", "seq": 1, "storageKey": "${figKey}", "width": ${width}, "height": ${height}, "sha256": "${sha256}"}`;
  raw = raw.slice(0, end + 1) + entry + raw.slice(end + 1);
}

const data = JSON.parse(raw);
const ex = data.exams.find(e => e.round === 'HEAT' && e.examNo === 3);
for (const q of ['q-03', 'q-04', 'q-08', 'q-13', 'q-15', 'q-25']) {
  const question = ex.questions.find(x => `q-${String(x.number).padStart(2, '0')}` === q);
  const figs = question.images.filter(i => i.role === 'FIGURE');
  if (figs.length !== 1) throw new Error(`${q}: expected 1 FIGURE, found ${figs.length}`);
  const figIndex = question.images.findIndex(i => i.role === 'FIGURE');
  if (question.images[figIndex - 1].role !== 'SNAPSHOT') throw new Error(`${q}: FIGURE not after SNAPSHOT`);
}

fs.writeFileSync(datasetPath, raw, 'utf8');

const reportPath = path.join(root, 'out/report.txt');
let report = fs.readFileSync(reportPath, 'utf8');
const before = 'HEAT        #3: 25 questions,  0 needs_review, 56 images';
const after = 'HEAT        #3: 25 questions,  0 needs_review, 62 images';
if (!report.includes(before)) throw new Error('report line not found');
report = report.replace(before, after);
fs.writeFileSync(reportPath, report, 'utf8');

console.log('updated HEAT #3: 6 figures added, text lines removed');