# Servidor local + proxy SyncPay (resolve "Failed to fetch" / CORS)
# Uso: python server.py  -> abre http://localhost:3000
# Não abra por duplo-clique (file:// bloqueia o Pix). Use o localhost.
import json, re, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, unquote
import os

PORT = int(os.environ.get('PORT', 3000))
BASE = 'https://api.syncpayments.com.br'
CLIENT_ID = 'd39a5306-9c01-49b3-9072-10ed7e24cf9d'
CLIENT_SECRET = '25c30f44-c04d-400a-9f8f-8292cf15b99e'
EXTRA_KEY = 'teste'
WEBHOOK_URL = 'https://seu-site.com/webhook'
AMOUNT = 29.90
ROOT = os.path.dirname(os.path.abspath(__file__))
MIME = {'.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml'}

def api(path, data, token=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(data, ensure_ascii=False).encode('utf-8'),
        headers={'Content-Type': 'application/json; charset=utf-8', 'Accept': 'application/json',
                 'User-Agent': 'Mozilla/5.0', **({'Authorization': 'Bearer ' + token} if token else {})},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')
        raise Exception('SyncPay %s %s: %s' % (path, e.code, detail))

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def end(self, code, ctype, data):
        b = data if isinstance(data, bytes) else data.encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    def do_POST(self):
        if urlparse(self.path).path != '/api/cashin':
            return self.end(404, 'text/plain', '404')
        try:
            n = int(self.headers.get('Content-Length', 0))
            d = json.loads(self.rfile.read(n).decode() or '{}')
            name, cpf = d.get('name'), re.sub(r'\D', '', str(d.get('cpf', '')))
            if not name or not cpf:
                return self.end(400, 'application/json', json.dumps({'message': 'name e cpf obrigatórios'}))
            email = d.get('email') or (cpf + '@pay.local')
            if '@' not in str(email): email = cpf + '@pay.local'
            phone = re.sub(r'\D', '', str(d.get('phone', '')))
            if len(phone) < 10: phone = '11999999999'
            t = api('/api/partner/v1/auth-token', {'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, '01K1259MAXE0TNRXV2C2WQN2MV': EXTRA_KEY})
            if 'access_token' not in t:
                return self.end(502, 'application/json', json.dumps(t))
            out = api('/api/partner/v1/cash-in', {'amount': AMOUNT, 'description': 'Inscrição concluída', 'webhook_url': WEBHOOK_URL,
                'client': {'name': name, 'cpf': cpf, 'email': email, 'phone': phone}}, t['access_token'])
            code = 200 if out.get('pix_code') else 422
            return self.end(code, 'application/json', json.dumps(out))
        except Exception as e:
            return self.end(500, 'application/json', json.dumps({'message': str(e)}))
    def do_GET(self):
        p = unquote(urlparse(self.path).path)
        if p == '/':
            p = '/index.html'
        elif p.endswith('/'):
            p = p + 'index.html'
        fp = os.path.join(ROOT, p.lstrip('/').replace('..', ''))
        if not os.path.isfile(fp):
            return self.end(404, 'text/plain', '404')
        with open(fp, 'rb') as f:
            return self.end(200, MIME.get(os.path.splitext(fp)[1].lower(), 'application/octet-stream'), f.read())

print('Servidor na porta %d' % PORT, flush=True)
HTTPServer(('0.0.0.0', PORT), H).serve_forever()
