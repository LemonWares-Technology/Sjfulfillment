const http = require('http');
const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, '..', 'public');
const port = 8085;
const server = http.createServer((req, res) => {
  const p = path.join(publicDir, req.url === '/' ? '/index.html' : req.url);
  fs.stat(p, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const rs = fs.createReadStream(p);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    rs.pipe(res);
  });
});
server.listen(port, ()=> console.log('static server on', port));

process.on('SIGINT', ()=> server.close());
