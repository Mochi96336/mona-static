import fs from 'node:fs';

const locked = JSON.parse(fs.readFileSync('upstream.lock.json', 'utf8'));
const latestRequested = process.argv.includes('--latest');
const endpoint = 'https://api.github.com/repos/TwiceDrop/genshin_artifact/';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'mona-static-github-actions',
  ...(process.env.GITHUB_TOKEN ? {Authorization: 'Bearer ' + process.env.GITHUB_TOKEN} : {})
};

async function json(path) {
  const response = await fetch(endpoint + path, {headers, signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('GitHub API ' + response.status + ': ' + path);
  return response.json();
}

function compare(a, b) {
  const parse = value => {
    if (!/^v\d+\.\d+\.\d+$/.test(value)) throw new Error('Unexpected release tag: ' + value);
    return value.substring(1).split('.').map(Number);
  };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

let tag = locked.tag, commit = locked.commit;
if (latestRequested) {
  const release = await json('releases/latest');
  if (!release || release.draft || release.prerelease) throw new Error('Latest release is not stable');
  if (compare(release.tag_name, tag) >= 0) {
    tag = release.tag_name;
    const ref = await json('git/ref/tags/' + encodeURIComponent(tag));
    let obj = ref.object;
    if (obj?.type === 'tag') obj = (await json('git/tags/' + obj.sha)).object;
    if (obj?.type !== 'commit' || !/^[a-f0-9]{40}$/.test(obj.sha)) throw new Error('Release tag must resolve to a commit');
    commit = obj.sha;
  }
}

if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid upstream commit');
const lines = ['tag=' + tag, 'commit=' + commit, 'release_changed=' + String(tag !== locked.tag)].join('\n') + '\n';
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines);
console.log('Resolved upstream release ' + tag + ' at ' + commit + (latestRequested ? ' (latest stable)' : ' (pinned)'));
