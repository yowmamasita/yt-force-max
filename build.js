const fs = require('fs');
const path = require('path');

const CORE = fs.readFileSync(path.join(__dirname, 'src/core.js'), 'utf-8');
const MARKER = '  // @include core.js';

const targets = [
  {
    src: 'src/userscript-head.js',
    out: 'yt-force-max.user.js',
  },
  {
    src: 'src/extension-page.js',
    out: 'extension/src/page-script.js',
  },
];

for (const { src, out } of targets) {
  const wrapper = fs.readFileSync(path.join(__dirname, src), 'utf-8');
  if (!wrapper.includes(MARKER)) {
    console.error(`Marker not found in ${src}`);
    process.exit(1);
  }
  // Indent core.js content to match surrounding code (2 spaces)
  const indented = CORE.split('\n')
    .map((line) => (line ? '  ' + line : line))
    .join('\n');
  const output = wrapper.replace(MARKER, indented);
  const outPath = path.join(__dirname, out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output);
  console.log(`Built ${out}`);
}
