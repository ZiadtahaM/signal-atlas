const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const DIR = path.join(__dirname, 'dist', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

let topics = [
  { id: 'top-1', number: '01', title: 'Design before implementation', summary: 'Delay code until human and agent share a verified theory of domain boundaries and invariants.', tags: ['#strategy', '#planning'] },
  { id: 'top-2', number: '02', title: 'Human = strategic / AI = tactical', summary: 'Keep ownership of meaning and contracts. Delegate bounded implementation slices.', tags: ['#roles', '#architecture'] },
  { id: 'top-3', number: '03', title: 'TDD as a speed limit', summary: 'Write one failing test, implement only enough to pass, inspect the result, then refactor.', tags: ['#TDD', '#feedback'] },
  { id: 'top-4', number: '04', title: 'Prefer deep modules', summary: 'Concentrate complexity behind small, robust interfaces rather than scattering it.', tags: ['#design', '#changeability'] }
];

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const reqPath = parsedUrl.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (reqPath.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (reqPath.includes('topics')) return res.end(JSON.stringify(topics));
    if (reqPath.includes('prompts')) {
      return res.end(JSON.stringify({
        grillMePrompt: '/grill-me I want to add [feature]. Inspect the repository, ask the high-leverage questions, and stop before coding.',
        planPrompt: '/plan Propose a test-driven slice for [feature] with clear boundary invariants.',
        reviewPrompt: '/code-review Inspect the latest diff against our Ubiquitous Language and module depth guidelines.'
      }));
    }
    return res.end(JSON.stringify({ success: true, topics }));
  }

  let file = path.join(DIR, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIR, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Signal Atlas Guide Backend & Frontend listening at http://localhost:' + PORT);
});
