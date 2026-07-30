// Vercel Serverless Function: proxy de leitura para o dashboard do
// administrador. Existe porque o Apps Script não retorna cabeçalhos CORS,
// então o navegador não consegue ler a resposta de um fetch direto — este
// endpoint roda no servidor (sem restrição de CORS) e repassa os dados.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const { DASHBOARD_PASSWORD, SHEETS_ENDPOINT, SHEETS_READ_TOKEN } = process.env;

  if (!DASHBOARD_PASSWORD || !SHEETS_ENDPOINT || !SHEETS_READ_TOKEN) {
    res.status(500).json({ ok: false, erro: "Servidor não configurado (variáveis de ambiente ausentes)." });
    return;
  }

  const pass = req.query.pass;
  if (pass !== DASHBOARD_PASSWORD) {
    res.status(401).json({ ok: false, erro: "Senha incorreta." });
    return;
  }

  try {
    const url = `${SHEETS_ENDPOINT}?action=dados&token=${encodeURIComponent(SHEETS_READ_TOKEN)}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.ok) {
      res.status(502).json({ ok: false, erro: data.erro || "Falha ao ler a planilha." });
      return;
    }

    res.status(200).json({ ok: true, rows: data.rows });
  } catch (e) {
    res.status(502).json({ ok: false, erro: "Falha ao conectar com o Apps Script." });
  }
}
