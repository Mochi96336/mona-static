import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'upstream');
const base = process.argv[3] || '/mona-static/';
if (!/^\/[A-Za-z0-9_.-]+\/$/.test(base)) {
  throw new Error('Expected a GitHub Pages project base such as /mona-static/');
}

function update(relativePath, oldText, newText) {
  const filename = path.join(root, relativePath);
  const before = fs.readFileSync(filename, 'utf8');
  if (!before.includes(oldText)) {
    throw new Error('Upstream changed; patch no longer applies: ' + relativePath + ' :: ' + oldText);
  }
  fs.writeFileSync(filename, before.replace(oldText, newText));
  console.log('Patched ' + relativePath);
}

const config = [
  'MONA_NEED_BEIAN: false',
  'MONA_ROUTE_MODE: hash',
  'MONA_TITLE: Mona Static',
  'MONA_NEED_MIGRATE: false',
  'TAURI: false',
  'USE_CDN: false',
  'MONA_STATIC: true',
  ''
].join('\n');
fs.writeFileSync(path.join(root, '.env.static.yaml'), config);

update('src/platform/native.mjs',
  "if (['127.0.0.1','localhost'].includes(location.hostname)) {",
  "if (!process.env.MONA_STATIC && ['127.0.0.1','localhost'].includes(location.hostname)) {");

update('src/api/misc.js',
  'if (process.env.MONA_MOBILE) {',
  'if (process.env.MONA_MOBILE || process.env.MONA_STATIC) {');

update('src/App.vue',
  "onMounted(() => {\n    window.addEventListener(MANUAL_UPDATE_EVENT, manualCheck)",
  "onMounted(() => {\n    if (process.env.MONA_STATIC) return;\n    window.addEventListener(MANUAL_UPDATE_EVENT, manualCheck)");

update('src/components/import/MiyousheImport.vue',
  "<script setup>\n",
  "<script setup>\nconst staticSite = process.env.MONA_STATIC === true\n");
update('src/components/import/MiyousheImport.vue',
  '<div class="mys-login">',
  '<div v-if="!staticSite" class="mys-login">');
update('src/components/import/MiyousheImport.vue',
  "onMounted(async () => {\n    const run = generation",
  "onMounted(async () => {\n    if (staticSite) return\n    const run = generation");

update('src/router/router.js',
  'if (to.path === "/import") {',
  'if (to.path === "/import") {\n        if (process.env.MONA_STATIC) { next({ name: "artifact" }); return }');

// Absolute URLs in the upstream generated catalog do not respect Vue publicPath.
// Rewrite those asset paths for GitHub Pages' project subdirectory.
let replaced = 0;
function visit(directory) {
  for (const dirent of fs.readdirSync(directory, {withFileTypes: true})) {
    const filename = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      visit(filename);
    } else if (/\.(js|mjs|ts|vue|json|scss|css)$/.test(dirent.name)) {
      const before = fs.readFileSync(filename, 'utf8');
      const after = before.replaceAll('/release-assets/', base + 'release-assets/');
      if (after !== before) {
        fs.writeFileSync(filename, after);
        replaced++;
      }
    }
  }
}
visit(path.join(root, 'src'));
visit(path.join(root, 'beta-data'));

// The new /characters/ and /beta/ image references are local too.
// Restrict these replacements to the generated character catalog to avoid
// rewriting unrelated external image URLs and import paths.
const characterCatalogPath = path.join(root, 'src/assets/_gen_character.js');
let characterCatalog = fs.readFileSync(characterCatalogPath, 'utf8');
for (const directory of ['characters', 'beta']) {
  const before = '"/' + directory + '/';
  const after = '"' + base + directory + '/';
  if (!characterCatalog.includes(before)) {
    throw new Error('Upstream character image catalog changed: missing ' + before);
  }
  characterCatalog = characterCatalog.replaceAll(before, after);
}
fs.writeFileSync(characterCatalogPath, characterCatalog);
console.log('Rebased release-assets in ' + replaced + ' source files and new-character image paths to ' + base);
