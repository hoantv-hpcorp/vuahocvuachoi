const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'D:/projects/timo2';
const datasetPath = path.join(root, 'out/dataset.json');
let raw = fs.readFileSync(datasetPath, 'utf8');

const exam = 'timo/grade2/heat/exam-05';
const questions = ['q-01', 'q-11', 'q-12', 'q-22'];

const data = JSON.parse(raw);
const ex = data.exams.find(e => e.round === 'HEAT' && e.examNo === 5);

for (const q of questions) {
  const number = Number(q.slice(2));
  const question = ex.questions.find(x => x.number === number);
  const lines = question.contentText.split('\n').filter(s => s.trim() !== '');
  const last = lines[lines.length - 1];
  const escaped = JSON.stringify(last).slice(1, -1);
  const target = `\\n${escaped}\\n`;
  const count = raw.split(target).length - 1;
  if (count !== 1) throw new Error(`${q}: expected 1 text match, found ${count}`);
  raw = raw.replace(target, '\\n');
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    sha256: crypto.createHash('sha256').update(b).digest('hex'),
  };
}

for (const q of questions) {
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

const check = JSON.parse(raw);
const ex2 = check.exams.find(e => e.round === 'HEAT' && e.examNo === 5);
for (const q of questions) {
  const number = Number(q.slice(2));
  const question = ex2.questions.find(x => x.number === number);
  const figs = question.images.filter(i => i.role === 'FIGURE');
  if (figs.length !== 1) throw new Error(`${q}: expected 1 FIGURE, found ${figs.length}`);
  const figIndex = question.images.findIndex(i => i.role === 'FIGURE');
  if (question.images[figIndex - 1].role !== 'SNAPSHOT') throw new Error(`${q}: FIGURE not after SNAPSHOT`);
  const lines = question.contentText.split('\n').filter(s => s.trim() !== '');
  if (lines[lines.length - 1] === '') throw new Error(`${q}: text line not removed`);
}

fs.writeFileSync(datasetPath, raw, 'utf8');

const reportPath = path.join(root, 'out/report.txt');
let report = fs.readFileSync(reportPath, 'utf8');
const before = 'HEAT        #5: 25 questions,  0 needs_review, 60 images';
const after = 'HEAT        #5: 25 questions,  0 needs_review, 64 images';
if (!report.includes(before)) throw new Error('report line not found');
report = report.replace(before, after);
fs.writeFileSync(reportPath, report, 'utf8');

console.log('updated HEAT #5: 4 figures added, text lines removed');
