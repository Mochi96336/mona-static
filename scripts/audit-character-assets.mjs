import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve(process.argv[2] || 'upstream');
const siteBase = process.argv[3] || '/mona-static/';
const raw = fs.readFileSync(path.join(sourceRoot, 'src/assets/_gen_character.js'), 'utf8');
const characterMap = JSON.parse(raw.replace(/^.*?export default\s*/s, '').replace(/;\s*$/, ''));

const counts = {characters: 0, local: 0, embedded: 0, external: 0, fields: 0};
const errors = [], externalHosts = new Map(), tracked = [];
const siteRoot = path.join(sourceRoot, 'dist');

for (const [name, char] of Object.entries(characterMap)) {
  counts.characters++;
  for (const field of ['avatar', 'splash']) {
    const image = char[field];
    counts.fields++;
    if (typeof image !== 'string' || !image) {
      errors.push(name + '.' + field + ': missing image reference');
      continue;
    }

    if (image.startsWith('data:image/')) {
      counts.embedded++;
      const match = image.match(/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) errors.push(name + '.' + field + ': invalid inline image');
      else {
        const bytes = Buffer.from(match[2], 'base64');
        if (bytes.byteLength < 100) errors.push(name + '.' + field + ': tiny inline image');
      }
      continue;
    }

    if (image.startsWith('https://')) {
      counts.external++;
      const host = new URL(image).hostname;
      externalHosts.set(host, (externalHosts.get(host) || 0) + 1);
      continue;
    }

    if (!image.startsWith(siteBase)) {
      errors.push(name + '.' + field + ': path escapes site prefix: ' + image);
      continue;
    }
    counts.local++;
    const relativePath = image.substring(siteBase.length);
    const target = path.resolve(siteRoot, relativePath);
    if (!target.startsWith(siteRoot + path.sep) || !fs.existsSync(target) || fs.statSync(target).size < 100) {
      errors.push(name + '.' + field + ': missing or empty emitted file: ' + image);
    } else tracked.push({name, field, path: relativePath});
  }
}

for (const name of ['Mitya', 'Valeriy', 'Vodyanitsa', 'Vesna']) {
  if (!characterMap[name]) errors.push('Missing required character ' + name);
}

const report = {
  upstreamVersion: process.env.UPSTREAM_TAG || 'pinned',
  counts,
  externalHosts: Object.fromEntries([...externalHosts].sort()),
  errors,
  notes: [
    'Local image paths and emitted file existence are checked.',
    'Remote avatar URLs are inventoried, not network-verified. They can fail independently of deployment.',
    'Image existence does not prove visual authenticity or match the intended character.'
  ]
};
fs.writeFileSync(path.join(siteRoot, 'character-image-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({counts, externalHosts: report.externalHosts, errors}, null, 2));
if (errors.length) process.exitCode = 1;
