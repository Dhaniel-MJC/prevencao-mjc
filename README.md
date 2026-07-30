# Prevenção MJC — Módulo de Inspeção

App instalável no celular (PWA) para inspeção por Norma Regulamentadora, com
envio automático dos resultados para uma planilha Google (sem custo de nuvem).

## Como funciona

- Cada técnico preenche a inspeção no celular dele. Os dados ficam salvos
  **localmente no aparelho** (mesmo offline).
- Ao tocar em **"Enviar inspeção"**, os dados vão para uma planilha Google sua,
  via um recurso gratuito chamado Apps Script (roda dentro da sua conta Google,
  sem servidor, sem custo).
- Se o técnico estiver sem sinal, o envio fica numa fila local e é reenviado
  sozinho assim que a conexão voltar (ou na próxima vez que o app abrir).

---

## Passo 1 — Criar a planilha e o endpoint de recebimento (Apps Script)

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha nova.
   Dê um nome como "Prevenção MJC — Inspeções".
2. No menu, vá em **Extensões → Apps Script**.
3. Apague todo o conteúdo do editor e cole o conteúdo do arquivo
   [`apps-script/Code.gs`](./apps-script/Code.gs) (está nesta mesma pasta).
4. Clique em **Implantar → Nova implantação**.
   - Tipo: **App da Web**.
   - Executar como: **Eu** (sua conta).
   - Quem pode acessar: **Qualquer pessoa**.
5. Autorize as permissões pedidas (é a sua própria planilha, é seguro).
6. Copie a **URL do app da Web** gerada — algo como:
   `https://script.google.com/macros/s/AKfycb.../exec`

> Toda vez que você editar o `Code.gs`, é preciso fazer **Implantar → Gerenciar
> implantações → editar (ícone de lápis) → Nova versão** para as mudanças
> valerem na URL já publicada.

## Passo 2 — Configurar o app com essa URL

Abra `src/config.js` e cole a URL copiada:

```js
export const SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycb.../exec";
```

## Passo 3 — Testar localmente (opcional, mas recomendado)

Requer [Node.js](https://nodejs.org) instalado no seu computador.

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (algo como `http://localhost:5173`),
preencha alguns itens de uma NR e clique em "Enviar inspeção". Confira se
uma nova linha apareceu na aba "Inspecoes" da sua planilha.

## Passo 4 — Publicar de graça (para os técnicos acessarem pelo celular)

Qualquer uma destas opções funciona sem custo:

**Opção A — Vercel (mais simples)**
1. Suba esta pasta para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), clique em "Add New Project" e
   selecione o repositório. Ele detecta o Vite automaticamente.
3. Clique em Deploy. Em cerca de 1 minuto você recebe uma URL pública
   (ex.: `prevencao-mjc.vercel.app`).

**Opção B — Netlify**
1. Mesma ideia: conecte o repositório do GitHub em [netlify.com](https://netlify.com).
2. Build command: `npm run build` — Publish directory: `dist`.

**Opção C — GitHub Pages**
Funciona, mas exige um ajuste extra de `base` no `vite.config.js` por causa
dos subcaminhos do GitHub Pages. Se preferir esse caminho, me avise que eu
ajusto o arquivo de configuração antes.

## Passo 5 — Instalar no celular do técnico

1. Envie o link publicado (ex.: `prevencao-mjc.vercel.app`) por WhatsApp/e-mail.
2. O técnico abre o link no navegador do celular.
3. **Android (Chrome):** toca no menu (⋮) → "Adicionar à tela inicial" (ou
   aparece um banner automático oferecendo a instalação).
4. **iPhone (Safari):** toca no ícone de compartilhar → "Adicionar à Tela de Início".
5. O app passa a abrir como um aplicativo normal, em tela cheia, com ícone
   próprio — sem passar pela App Store/Google Play.

## Sobre os dados na planilha

Cada envio grava uma linha por item respondido (mais uma linha por
"apontamento geral" de cada NR), na aba **Inspecoes**, com colunas:

`recebido_em | inspetor | empresa | unidade | data_inspecao | nr_numero | nr_titulo | tipo | item_cod | item_texto | status | observacao`

Isso já permite montar tabelas dinâmicas e gráficos direto no Google Sheets
(ex.: contagem de "Não atende" por empresa, % de conformidade por NR, etc.)
enquanto o dashboard definitivo dentro do próprio app não é construído.

## Próximos passos possíveis

- Autenticação (login) separando visão de administrador e de técnico.
- Dashboard dentro do próprio app, lendo os dados da planilha (ou já migrando
  para Firebase, se o volume de inspeções crescer).
- Geração de PDF do relatório de inspeção.
