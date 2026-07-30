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
const CONFIG_RANGE = "Config!B2";
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

// O Sheets guarda datas como número de série (dias desde 1899-12-30). Como
// pedimos valueRenderOption=UNFORMATTED_VALUE (para não perder a hora exata
// de "recebido_em", que identifica cada envio), colunas de data voltam como
// number em vez de string — convertemos de volta para um horário real aqui.
function serialParaISO(serial) {
  const dias = Math.floor(serial);
  const fracaoDia = serial - dias;
  const ms = Date.UTC(1899, 11, 30) + dias * 86400000 + Math.round(fracaoDia * 86400000);
  return new Date(ms).toISOString();
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

  // DASHBOARD_PASSWORD é só um valor de bootstrap: a senha "de verdade" mora
  // na aba Config da planilha (Config!B2), para o admin poder trocá-la pelo
  // próprio app. Enquanto essa célula estiver vazia (nunca foi trocada),
  // caímos de volta na variável de ambiente.
  const { DASHBOARD_PASSWORD, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    res.status(500).json({ ok: false, erro: "Servidor não configurado (variáveis de ambiente ausentes)." });
    return;
  }

  try {
    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
    const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_EMAIL, privateKey);
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const inspecoesUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}` +
      `?valueRenderOption=UNFORMATTED_VALUE`;
    const inspecoesResp = await fetch(inspecoesUrl, { headers: authHeader });
    const inspecoesData = await inspecoesResp.json();

    if (!inspecoesResp.ok) {
      res.status(502).json({ ok: false, erro: inspecoesData.error?.message || "Falha ao ler a planilha." });
      return;
    }
    const inspecoesValues = inspecoesData.values || [];

    // A aba "Config" só é criada pelo Apps Script na primeira troca de
    // senha — até lá, essa leitura falha (aba inexistente) e caímos no
    // fallback da variável de ambiente, sem quebrar o login.
    let senhaNaPlanilha = "";
    try {
      const configUrl =
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}` +
        `?valueRenderOption=UNFORMATTED_VALUE`;
      const configResp = await fetch(configUrl, { headers: authHeader });
      if (configResp.ok) {
        const configData = await configResp.json();
        senhaNaPlanilha = configData.values?.[0]?.[0] ? String(configData.values[0][0]) : "";
      }
    } catch (e) {
      // aba Config ainda não existe — segue com o fallback
    }

    const senhaValida = senhaNaPlanilha || DASHBOARD_PASSWORD || "";

    if (!senhaValida || req.query.pass !== senhaValida) {
      res.status(401).json({ ok: false, erro: "Senha incorreta." });
      return;
    }

    const rows = inspecoesValues.map((linha) => {
      const obj = {};
      COLUMNS.forEach((col, i) => {
        let valor = linha[i] ?? "";
        if ((col === "recebido_em" || col === "data_inspecao") && typeof valor === "number") {
          valor = serialParaISO(valor);
        }
        obj[col] = valor;
      });
      return obj;
    });

    res.status(200).json({ ok: true, rows });
  } catch (e) {
    res.status(502).json({ ok: false, erro: "Falha ao conectar com o Google: " + e.message });
  }
}
