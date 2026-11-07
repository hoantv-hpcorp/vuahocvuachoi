const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'D:/projects/timo2';
const datasetPath = path.join(root, 'out/dataset.json');
let raw = fs.readFileSync(datasetPath, 'utf8');

const exam = 'timo/grade2/heat/exam-07';

const textEdits = [
  ['q-02', 'trái.\\n○ △ □ ○ △ □ ○ △ □ …\\n', 'trái.\\n'],
  ['q-05', 'Space: Chỗ trống.\\nA 、 E 、 I 、 M 、 __\\n', 'Space: Chỗ trống.\\n'],
  ['q-12', 'phiếu trả lời.\\n7      4      5      3  =  13\\n', 'phiếu trả lời.\\n'],
  ['q-13', 'Dãy số cách đều.\\n12、21、30、39、48、…\\n', 'Dãy số cách đều.\\n'],
  ['q-21', 'Số có 2 chữ số.\\n15 + 13,  19 − 7,  14 − 9, 5 + 9, 19 −10,  11− 8,  17 − 9, 3 + 7, 18 − 7\\n', 'Số có 2 chữ số.\\n'],
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

const figureQuestions = ['q-02', 'q-05', 'q-12', 'q-13', 'q-21'];

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
const ex = data.exams.find(e => e.round === 'HEAT' && e.examNo === 7);
for (const q of figureQuestions) {
  const number = Number(q.slice(2));
  const question = ex.questions.find(x => x.number === number);
  const figs = question.images.filter(i => i.role === 'FIGURE');
  if (figs.length !== 1) throw new Error(`${q}: expected 1 FIGURE, found ${figs.length}`);
  const figIndex = question.images.findIndex(i => i.role === 'FIGURE');
  if (question.images[figIndex - 1].role !== 'SNAPSHOT') throw new Error(`${q}: FIGURE not after SNAPSHOT`);
  const lines = question.contentText.split('\n').filter(s => s.trim() !== '');
  const last = lines[lines.length - 1];
  if (last.includes('○') || last.includes('A 、') || last.includes('=  13') || last.includes('12、21') || last.includes('15 + 13')) {
    throw new Error(`${q}: sequence text line not removed (${last})`);
  }
}

fs.writeFileSync(datasetPath, raw, 'utf8');

const reportPath = path.join(root, 'out/report.txt');
let report = fs.readFileSync(reportPath, 'utf8');
const before = 'HEAT        #7: 25 questions,  0 needs_review, 58 images';
const after = 'HEAT        #7: 25 questions,  0 needs_review, 63 images';
if (!report.includes(before)) throw new Error('report line not found');
report = report.replace(before, after);
fs.writeFileSync(reportPath, report, 'utf8');

console.log('updated HEAT #7: 5 figures added, 5 text lines removed');
