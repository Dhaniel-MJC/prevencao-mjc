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

## Passo 6 — Dashboard do administrador

O app tem uma aba **Dashboard** que lê os dados consolidados direto da
planilha (conformidade por NR, ranking de empresas com mais "Não atende",
histórico de inspeções). A leitura passa por uma função serverless da
própria Vercel (`api/dashboard.js`), que autentica com uma **conta de
serviço do Google** e lê a planilha pela Sheets API oficial — e protege o
acesso com uma senha.

(Testamos usar o próprio endpoint do Apps Script para isso, mas o Google
redireciona chamadas feitas por servidores para uma tela de login mesmo com
a implantação pública — por isso a leitura usa a Sheets API, que não tem
essa limitação.)

**Configuração (uma vez só):**

1. Crie uma conta de serviço no [Google Cloud Console](https://console.cloud.google.com/):
   - Crie um projeto (ou use um existente).
   - Ative a **Google Sheets API** (busque por "Google Sheets API" e clique em Ativar).
   - Em **APIs e Serviços → Credenciais → Criar credenciais → Conta de serviço**,
     crie uma conta de serviço (não precisa conceder nenhum papel/role).
   - Na conta de serviço criada, aba **Chaves → Adicionar chave → Criar nova
     chave → JSON**. Isso baixa um arquivo `.json`.
2. Abra o arquivo `.json` baixado e copie os campos `client_email` e
   `private_key`.
3. Na planilha do Google Sheets, clique em **Compartilhar** e adicione o
   e-mail da conta de serviço (`client_email`) como **Leitor**.
4. Na Vercel, configure 3 variáveis de ambiente do projeto
   (Settings → Environment Variables):
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — o `client_email` do passo 2.
   - `GOOGLE_PRIVATE_KEY` — o `private_key` do passo 2 (cole com as quebras
     de linha; a Vercel aceita colar o valor como veio no JSON).
   - `GOOGLE_SHEET_ID` — o ID da planilha (o trecho da URL entre `/d/` e
     `/edit`).
   - `DASHBOARD_PASSWORD` (opcional) — senha inicial usada só até a primeira
     troca de senha feita pelo próprio app (veja abaixo). Depois disso, quem
     manda é a aba **Config** da planilha.
5. Redeploy do projeto na Vercel para essas variáveis entrarem em vigor.

A chave da conta de serviço nunca fica no código-fonte nem no bundle que
roda no navegador — só existe como variável de ambiente do servidor. A
conta de serviço só tem acesso de **leitura** a esta planilha específica (a
que você compartilhou com ela), nada mais na sua conta Google.

**Trocar a senha do dashboard:** dentro da aba Dashboard, clique em
"Trocar senha". A senha nova é gravada na aba **Config** (criada
automaticamente na planilha, célula B2) — a troca é feita pelo próprio
Apps Script (que tem acesso de escrita à planilha), sem precisar mexer em
nada na Vercel.

## Próximos passos possíveis

- Autenticação (login) por usuário, em vez de senha única compartilhada.
- Geração de PDF do relatório de inspeção.
- Filtros por empresa/período no dashboard.
