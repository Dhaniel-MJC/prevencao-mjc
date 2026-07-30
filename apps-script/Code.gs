/**
 * Prevenção MJC — endpoint gratuito para receber inspeções e gravar
 * numa aba da planilha Google. Não precisa de servidor nem de custo
 * de nuvem: roda dentro da sua própria conta Google.
 *
 * COMO INSTALAR (veja o passo a passo completo no README.md):
 * 1. Crie uma planilha nova no Google Sheets.
 * 2. Menu Extensões > Apps Script.
 * 3. Apague o conteúdo padrão e cole todo este arquivo.
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL gerada (termina em /exec) e cole em src/config.js.
 */

var NOME_ABA = "Inspecoes";
var CABECALHO = [
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

function getOuCriaAba_() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(NOME_ABA);
  if (!aba) {
    aba = planilha.insertSheet(NOME_ABA);
  }
  if (aba.getLastRow() === 0) {
    aba.appendRow(CABECALHO);
    aba.setFrozenRows(1);
  }
  return aba;
}

var NOME_CONFIG = "Config";

// Aba simples de chave/valor para configurações do app (hoje só a senha do
// dashboard). Fica na própria planilha para o admin poder trocar a senha
// direto pelo app, sem precisar mexer em variável de ambiente na Vercel.
function getOuCriaConfig_() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(NOME_CONFIG);
  if (!aba) {
    aba = planilha.insertSheet(NOME_CONFIG);
    aba.getRange("A1:B1").setValues([["chave", "valor"]]);
    aba.getRange("A2:B2").setValues([["senha_dashboard", ""]]);
    aba.setFrozenRows(1);
  }
  return aba;
}

function getSenhaDashboard_() {
  return String(getOuCriaConfig_().getRange("B2").getValue() || "");
}

function setSenhaDashboard_(novaSenha) {
  getOuCriaConfig_().getRange("B2").setValue(novaSenha);
}

function doPost(e) {
  var resposta = { ok: false };
  try {
    var dados = JSON.parse(e.postData.contents);

    if (dados.action === "trocarSenha") {
      var senhaAtualNaPlanilha = getSenhaDashboard_();
      if (senhaAtualNaPlanilha !== "" && senhaAtualNaPlanilha !== dados.senhaAtual) {
        resposta = { ok: false, erro: "Senha atual incorreta" };
      } else {
        setSenhaDashboard_(dados.novaSenha);
        resposta = { ok: true };
      }
      return ContentService.createTextOutput(JSON.stringify(resposta)).setMimeType(ContentService.MimeType.JSON);
    }

    var aba = getOuCriaAba_();
    var linhas = dados.rows || [];
    var agora = new Date();

    var linhasParaGravar = linhas.map(function (item) {
      return [
        agora,
        dados.inspetor || "",
        dados.empresa || "",
        dados.unidade || "",
        dados.dataInspecao || "",
        item.nrNumero || "",
        item.nrTitulo || "",
        item.tipo || "",
        item.itemCod || "",
        item.itemTexto || "",
        item.status || "",
        item.observacao || "",
      ];
    });

    if (linhasParaGravar.length > 0) {
      aba
        .getRange(aba.getLastRow() + 1, 1, linhasParaGravar.length, CABECALHO.length)
        .setValues(linhasParaGravar);
    }

    resposta = { ok: true, linhasGravadas: linhasParaGravar.length };
  } catch (erro) {
    resposta = { ok: false, erro: String(erro) };
  }

  return ContentService.createTextOutput(JSON.stringify(resposta)).setMimeType(ContentService.MimeType.JSON);
}

// Permite abrir a URL no navegador só para conferir se o endpoint está ativo.
function doGet(e) {
  return ContentService.createTextOutput(
    "Endpoint do Prevenção MJC está ativo. Use POST para enviar inspeções."
  ).setMimeType(ContentService.MimeType.TEXT);
}
