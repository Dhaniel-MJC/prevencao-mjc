import { createSign } from "node:crypto";

// Vercel Serverless Function: lê os dados da planilha para o dashboard do
// administrador usando a Google Sheets API com uma conta de serviço.
//
// Por que não usar o endpoint do Apps Script (como o envio de inspeções
// usa)? Testamos e o Google redireciona qualquer chamada feita por um
// servidor (não-navegador) para uma tela de login, mesmo com a implantação
// como "Qualquer pessoa" — isso não é CORS, é detecção de tráfego
// automatizado do próprio Google, e não tem contorno confiável. A Sheets
// API oficial, autenticada via conta de serviço, não tem essa limitação.

const SHEET_RANGE = "Inspecoes!A2:L";
const COLUMNS = [
  "recebido_em",
  "inspetor",
  "empresa",
  "unidade",
  "data_inspecao",
  "nr_numero",
  "nr_titulo",
  "tipo",
  "item_cod",
  "item_texto",
  "status",
  "observacao",
];

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error_description || "Falha ao obter token de acesso do Google");
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const { DASHBOARD_PASSWORD, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;

  if (!DASHBOARD_PASSWORD || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    res.status(500).json({ ok: false, erro: "Servidor não configurado (variáveis de ambiente ausentes)." });
    return;
  }

  if (req.query.pass !== DASHBOARD_PASSWORD) {
    res.status(401).json({ ok: false, erro: "Senha incorreta." });
    return;
  }

  try {
    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
    const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_EMAIL, privateKey);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await resp.json();

    if (!resp.ok) {
      res.status(502).json({ ok: false, erro: data.error?.message || "Falha ao ler a planilha." });
      return;
    }

    const rows = (data.values || []).map((linha) => {
      const obj = {};
      COLUMNS.forEach((col, i) => {
        obj[col] = linha[i] ?? "";
      });
      return obj;
    });

    res.status(200).json({ ok: true, rows });
  } catch (e) {
    res.status(502).json({ ok: false, erro: "Falha ao conectar com o Google: " + e.message });
  }
}
