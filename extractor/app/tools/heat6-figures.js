const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'D:/projects/timo2';
const datasetPath = path.join(root, 'out/dataset.json');
let raw = fs.readFileSync(datasetPath, 'utf8');

const exam = 'timo/grade2/heat/exam-06';

const textEdits = [
  ['q-03', 'Blank: Chỗ trống.\\n12 、 15 、 21 、 30 、 42 、 57 、 __\\n', 'Blank: Chỗ trống.\\n'],
  ['q-04', 'Space: Chỗ trống.\\nP 、 M 、 J 、 G 、 __\\n', 'Space: Chỗ trống.\\n'],
  ['q-09', 'Value: Giá trị.\\nA A\\n+  A B\\n7 2\\n', 'Value: Giá trị.\\n'],
  ['q-10', 'Correct: Đúng.\\n_____÷2+9 =19\\n', 'Correct: Đúng.\\n'],
  ['q-12', 'phiếu trả lời.\\n15      8      6      1 = 16\\n', 'phiếu trả lời.\\n'],
  ['q-13', 'phiếu trả lời.\\n6      4      3      2 = 29\\n', 'phiếu trả lời.\\n'],
  ['q-15', 'Value: Giá trị.\\nB A\\n+   A B\\nC 8 7\\n', 'Value: Giá trị.\\n'],
  ['q-16', 'Space: Chỗ trống.\\n●▲●□●▲●□●▲●__●▲●□ ...\\n', 'Space: Chỗ trống.\\n'],
  ['q-25', 'Greatest: Lớn nhất.\\n20196951 、 20186421、 2020345 、 20198462\\n', 'Greatest: Lớn nhất.\\n'],
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

const figureQuestions = ['q-03', 'q-04', 'q-09', 'q-10', 'q-12', 'q-13', 'q-15', 'q-25'];

for (const q of figureQuestions) {
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
const ex = data.exams.find(e => e.round === 'HEAT' && e.examNo === 6);
for (const q of figureQuestions) {
  const number = Number(q.slice(2));
  const question = ex.questions.find(x => x.number === number);
  const figs = question.images.filter(i => i.role === 'FIGURE');
  if (figs.length !== 1) throw new Error(`${q}: expected 1 FIGURE, found ${figs.length}`);
  const figIndex = question.images.findIndex(i => i.role === 'FIGURE');
  if (question.images[figIndex - 1].role !== 'SNAPSHOT') throw new Error(`${q}: FIGURE not after SNAPSHOT`);
  const lines = question.contentText.split('\n').filter(s => s.trim() !== '');
  const last = lines[lines.length - 1];
  if (/[0-9A-Z_▲●□]{2,}.*/.test(last) && !last.includes(':')) throw new Error(`${q}: text line not removed (${last})`);
}
const q16 = ex.questions.find(x => x.number === 16);
if (q16.contentText.includes('●▲●□')) throw new Error('q-16 extra text line not removed');

fs.writeFileSync(datasetPath, raw, 'utf8');

const reportPath = path.join(root, 'out/report.txt');
let report = fs.readFileSync(reportPath, 'utf8');
const before = 'HEAT        #6: 25 questions,  0 needs_review, 57 images';
const after = 'HEAT        #6: 25 questions,  0 needs_review, 65 images';
if (!report.includes(before)) throw new Error('report line not found');
report = report.replace(before, after);
fs.writeFileSync(reportPath, report, 'utf8');

console.log('updated HEAT #6: 8 figures added, 9 text lines removed');
