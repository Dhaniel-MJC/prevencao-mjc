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

function doPost(e) {
  var resposta = { ok: false };
  try {
    var aba = getOuCriaAba_();
    var dados = JSON.parse(e.postData.contents);
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

// Permite abrir a URL no navegador só para conferir se o endpoint está ativo,
// e serve os dados da planilha (JSON) para o dashboard do administrador
// quando chamado com ?action=dados&token=... (token configurado em
// Configurações do projeto > Propriedades do script > READ_TOKEN).
function doGet(e) {
  if (e.parameter.action === "dados") {
    return responderDados_(e);
  }
  return ContentService.createTextOutput(
    "Endpoint do Prevenção MJC está ativo. Use POST para enviar inspeções."
  ).setMimeType(ContentService.MimeType.TEXT);
}

function responderDados_(e) {
  var tokenEsperado = PropertiesService.getScriptProperties().getProperty("READ_TOKEN");
  if (!tokenEsperado || e.parameter.token !== tokenEsperado) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, erro: "não autorizado" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var aba = getOuCriaAba_();
  var ultimaLinha = aba.getLastRow();
  var rows = [];
  if (ultimaLinha > 1) {
    var valores = aba.getRange(2, 1, ultimaLinha - 1, CABECALHO.length).getValues();
    rows = valores.map(function (linha) {
      var obj = {};
      CABECALHO.forEach(function (nomeCampo, i) {
        var valor = linha[i];
        obj[nomeCampo] = valor instanceof Date ? valor.toISOString() : valor;
      });
      return obj;
    });
  }

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, rows: rows })
  ).setMimeType(ContentService.MimeType.JSON);
}
