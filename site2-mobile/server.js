// Servidor local + proxy SyncPay (resolve o "Failed to fetch" / CORS)
// Uso: node server.js  -> abre http://localhost:3000
// Não abra por duplo-clique no arquivo (file://), use o localhost.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = 'https://api.syncpayments.com.br';
const CLIENT_ID = 'd39a5306-9c01-49b3-9072-10ed7e24cf9d';
const CLIENT_SECRET = '25c30f44-c04d-400a-9f8f-8292cf15b99e';
const EXTRA_KEY = 'teste';
const WEBHOOK_URL = 'https://seu-site.com/webhook';
const AMOUNT = 29.90;

const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

async function authToken() {
  const r = await fetch(BASE_URL + '/api/partner/v1/auth-token', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, '01K1259MAXE0TNRXV2C2WQN2MV': EXTRA_KEY })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('auth: ' + JSON.stringify(j));
  return j.access_token;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/cashin') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { name, cpf, email, phone } = JSON.parse(body || '{}');
        if (!name || !cpf) throw new Error('name e cpf obrigatórios');
        const cpf11 = String(cpf).replace(/\D/g, '');
        const em = email && email.includes('@') ? email : cpf11 + '@pay.local';
        let ph = String(phone || '').replace(/\D/g, '');
        if (ph.length < 10) ph = '11999999999';
        const token = await authToken();
        const r = await fetch(BASE_URL + '/api/partner/v1/cash-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ amount: AMOUNT,       description: 'Inscrição concluída', webhook_url: WEBHOOK_URL, client: { name, cpf: cpf11, email: em, phone: ph } })
        });
        const j = await r.json();
        if (!j.pix_code) { res.writeHead(422, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(j));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: e.message }));
      }
    });
    return;
  }

  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const fp = path.join(__dirname, decodeURIComponent(file));
  if (!fp.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log('Aberto em http://localhost:' + PORT + '  (use esse link, não o file://)'));
