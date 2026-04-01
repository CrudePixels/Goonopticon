const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const durationSec = 0.25;
const freq = 520;
const numSamples = Math.floor(sampleRate * durationSec);

const buffer = Buffer.alloc(44 + numSamples * 2);
let offset = 0;

function writeStr(s) {
  buffer.write(s, offset);
  offset += s.length;
}
function writeU32(n) {
  buffer.writeUInt32LE(n, offset);
  offset += 4;
}
function writeU16(n) {
  buffer.writeUInt16LE(n, offset);
  offset += 2;
}

writeStr('RIFF');
writeU32(36 + numSamples * 2);
writeStr('WAVE');
writeStr('fmt ');
writeU32(16);
writeU16(1);
writeU16(1);
writeU32(sampleRate);
writeU32(sampleRate * 2);
writeU16(2);
writeU16(16);
writeStr('data');
writeU32(numSamples * 2);

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const sample = Math.sin(2 * Math.PI * freq * t) * 0.25;
  const n = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
  buffer.writeInt16LE(n, offset);
  offset += 2;
}

function writeWav(filename, sampleRate, durationSec, freq, volume = 0.25) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buf = Buffer.alloc(44 + numSamples * 2);
  let off = 0;
  function w(str) { buf.write(str, off); off += str.length; }
  function w32(n) { buf.writeUInt32LE(n, off); off += 4; }
  function w16(n) { buf.writeUInt16LE(n, off); off += 2; }
  w('RIFF');
  w32(36 + numSamples * 2);
  w('WAVE');
  w('fmt ');
  w32(16);
  w16(1);
  w16(1);
  w32(sampleRate);
  w32(sampleRate * 2);
  w16(2);
  w16(16);
  w('data');
  w32(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * volume;
    const n = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buf.writeInt16LE(n, off);
    off += 2;
  }
  return buf;
}

const outDir = path.join(__dirname, '../src/renderer/sounds');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'boot.wav'), writeWav(44100, 0.25, 520, 0.25));
console.log('Wrote src/renderer/sounds/boot.wav');

const exitNumSamples = Math.floor(44100 * 0.35);
const exitBuf = Buffer.alloc(44 + exitNumSamples * 2);
let exitOff = 0;
function ew(s) { exitBuf.write(s, exitOff); exitOff += s.length; }
function ew32(n) { exitBuf.writeUInt32LE(n, exitOff); exitOff += 4; }
function ew16(n) { exitBuf.writeUInt16LE(n, exitOff); exitOff += 2; }
ew('RIFF');
ew32(36 + exitNumSamples * 2);
ew('WAVE');
ew('fmt ');
ew32(16);
ew16(1);
ew16(1);
ew32(44100);
ew32(88200);
ew16(2);
ew16(16);
ew('data');
ew32(exitNumSamples * 2);
for (let i = 0; i < exitNumSamples; i++) {
  const t = i / 44100;
  const freq = 400 - (t / 0.35) * 150;
  const sample = Math.sin(2 * Math.PI * freq * t) * 0.2 * (1 - t / 0.35);
  const n = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
  exitBuf.writeInt16LE(n, exitOff);
  exitOff += 2;
}
fs.writeFileSync(path.join(outDir, 'exit.wav'), exitBuf);
console.log('Wrote src/renderer/sounds/exit.wav');
