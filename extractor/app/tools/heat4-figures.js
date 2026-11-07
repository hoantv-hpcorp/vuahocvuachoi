const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'D:/projects/timo2';
const datasetPath = path.join(root, 'out/dataset.json');
let raw = fs.readFileSync(datasetPath, 'utf8');

const exam = 'timo/grade2/heat/exam-04';

const textEdits = [
  ['q-03', 'Table: Bảng.\\n3 2 6\\n5 4 20\\n7 6 ？\\n9 8 72\\n', 'Table: Bảng.\\n'],
  ['q-04', 'Space: Chỗ trống.\\nK 、 N 、 P 、 S 、 U 、 __\\n', 'Space: Chỗ trống.\\n'],
  ['q-08', 'Các số có 1 chữ số khác nhau.\\nA\\n+ B B\\n7 3\\n', 'Các số có 1 chữ số khác nhau.\\n'],
  ['q-13', '8th number: Số thứ 8.\\n94、86、78、70、62、…\\n', '8th number: Số thứ 8.\\n'],
  ['q-15', 'phép tính vào phiếu trả lời).\\n9      18      3      7  =  23\\n', 'phép tính vào phiếu trả lời).\\n'],
  ['q-25', 'Between: Ở giữa.\\n99÷3,   19+19,   51−34,   6×8,   24+48,   5×5,   15+16\\n', 'Between: Ở giữa.\\n'],
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
const ex = data.exams.find(e => e.round === 'HEAT' && e.examNo === 4);
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
const before = 'HEAT        #4: 25 questions,  0 needs_review, 57 images';
const after = 'HEAT        #4: 25 questions,  0 needs_review, 63 images';
if (!report.includes(before)) throw new Error('report line not found');
report = report.replace(before, after);
fs.writeFileSync(reportPath, report, 'utf8');

console.log('updated HEAT #4: 6 figures added, text lines removed');
