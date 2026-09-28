// Exemplo backend Node para SyncPay - não exponha client_secret no frontend
// Uso: node api-syncpay-exemplo.js | ou adapte para Netlify Function / VPS
// Endpoint: POST /cashin {name, cpf, email, phone} -> {pix_code, identifier}
const BASE_URL = 'https://api.syncpayments.com.br';
const CLIENT_ID = 'd39a5306-9c01-49b3-9072-10ed7e24cf9d';
const CLIENT_SECRET = '25c30f44-c04d-400a-9f8f-8292cf15b99e';
const EXTRA_KEY = 'teste';
const WEBHOOK_URL = 'https://seu-site.com/webhook';
const AMOUNT = 29.90;

async function authToken() {
  const r = await fetch(BASE_URL + '/api/partner/v1/auth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, '01K1259MAXE0TNRXV2C2WQN2MV': EXTRA_KEY })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('auth falhou: ' + JSON.stringify(j));
  return j.access_token;
}

async function cashIn(token, { name, cpf, email, phone }) {
  const r = await fetch(BASE_URL + '/api/partner/v1/cash-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      amount: AMOUNT,
      description: 'Inscrição concluída',
      webhook_url: WEBHOOK_URL,
      client: { name, cpf: String(cpf).replace(/\D/g, ''), email, phone: String(phone).replace(/\D/g, '') }
    })
  });
  return r.json();
}

// Teste rápido: node api-syncpay-exemplo.js "Nome" 12345678900 email@test.com 11999999999
(async () => {
  const [, , name = 'Teste', cpf = '12345678900', email = 'teste@test.com', phone = '11999999999'] = process.argv;
  try {
    const token = await authToken();
    const out = await cashIn(token, { name, cpf, email, phone });
    console.log(JSON.stringify(out, null, 2));
  } catch (e) { console.error(e.message); process.exit(1); }
})();
