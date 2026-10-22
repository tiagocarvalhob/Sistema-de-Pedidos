// Servidor do Subarashi: serve o site e recebe os pedidos das mesas.
// Sem dependências externas — rode com:  node server.js
//
// Variáveis de ambiente (opcionais):
//   PORT        porta do servidor (padrão 3000)
//   PIN          senha da equipe: tela da cozinha/garçom (padrão 1234 — troque!)
//   PIN_GERENTE  senha do gerente: tudo da equipe + painel de métricas e cadastro de garçons (padrão 9876 — troque!)
//   PUBLIC_URL   endereço público do site, usado nos QR codes (ex.: https://subarashi.com.br)
//   TABLE_SECRET segredo que assina os QR codes. Em hospedagem na nuvem, DEFINA (senão os QR codes mudam a cada reinício)
//   SUPABASE_URL + SUPABASE_KEY  (opcional) guarda pedidos, contas e garçons num banco Supabase gratuito,
//                para não perder os dados quando o servidor reinicia. Sem eles, os dados ficam em data/db.json

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MENU, RODIZIO } = require("./menu.js");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const PORT = Number(process.env.PORT) || 3000;
const PIN = process.env.PIN || "1234";
const PIN_GERENTE = process.env.PIN_GERENTE || "9876";

fs.mkdirSync(DATA_DIR, { recursive: true });

// Segredo usado para assinar os links das mesas (variável TABLE_SECRET, ou gerado uma vez e guardado)
let config = {};
try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch {}
if (process.env.TABLE_SECRET) config.secret = process.env.TABLE_SECRET;
if (!config.secret) {
  config.secret = crypto.randomBytes(24).toString("hex");
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ---------- Banco de dados simples (arquivo local ou Supabase) ----------
// garcons: equipe que atende as mesas · mesas: garçom responsável por cada mesa aberta
// contas: contas fechadas (faturamento) · ajustes: comissão (%) e valor do rodízio por pessoa
let db = { pedidos: [], chamados: [], garcons: [], mesas: {}, contas: [], ajustes: { comissao: 10, rodizio: 99.9 }, seq: 0 };
const SUPA = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? { url: process.env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/subarashi_estado",
      headers: { apikey: process.env.SUPABASE_KEY, Authorization: "Bearer " + process.env.SUPABASE_KEY, "Content-Type": "application/json" } }
  : null;

async function carregarDb() {
  if (SUPA) {
    const r = await fetch(SUPA.url + "?id=eq.1&select=dados", { headers: SUPA.headers });
    if (!r.ok) throw new Error(`Supabase respondeu ${r.status}: ${await r.text()}`);
    const linhas = await r.json();
    if (linhas[0]?.dados) db = { ...db, ...linhas[0].dados };
    return "Supabase";
  }
  try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) }; } catch {}
  return "arquivo data/db.json";
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!SUPA) return fs.writeFile(DB_FILE, JSON.stringify(db), () => {});
    fetch(SUPA.url, { method: "POST", headers: { ...SUPA.headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: 1, dados: db, atualizado: new Date().toISOString() }) })
      .then(r => { if (!r.ok) r.text().then(t => console.error("Erro ao salvar no Supabase:", r.status, t)); })
      .catch(e => console.error("Erro ao salvar no Supabase:", e.message));
  }, SUPA ? 1000 : 200);
}
const nextId = () => ++db.seq;

// ---------- Cardápio conhecido pelo servidor (preços confiáveis) ----------
const PRECOS = new Map();
MENU.forEach(c => c.itens.forEach(i => PRECOS.set(i.n, i.p)));
const RODIZIO_ITENS = new Set();
RODIZIO.forEach(c => c.itens.forEach(i => RODIZIO_ITENS.add(i.n)));

// ---------- Assinatura das mesas ----------
const tableKey = mesa => crypto.createHmac("sha256", config.secret).update("mesa:" + mesa).digest("hex").slice(0, 10);
function mesaValida(mesa, k) {
  mesa = Number(mesa);
  if (!Number.isInteger(mesa) || mesa < 1 || mesa > 200 || typeof k !== "string") return null;
  const a = Buffer.from(tableKey(mesa)), b = Buffer.from(k);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? mesa : null;
}

// ---------- Sessões da equipe (cozinha/garçom) ----------
const sessoes = new Map(); // token -> "equipe" | "gerente"
function papel(req) {
  const m = /(?:^|;\s*)sb_sessao=([a-f0-9]{48})/.exec(req.headers.cookie || "");
  return (m && sessoes.get(m[1])) || null;
}
const pinIgual = (a, b) => typeof a === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const tentativas = new Map(); // ip -> {n, ate}

// ---------- Tempo real (Server-Sent Events) ----------
const ouvintes = new Set();
function avisar(tipo, dado) {
  const msg = `event: ${tipo}\ndata: ${JSON.stringify(dado)}\n\n`;
  ouvintes.forEach(res => res.write(msg));
}
setInterval(() => ouvintes.forEach(res => res.write(": ping\n\n")), 25000);

// ---------- Utilitários HTTP ----------
function json(res, status, obj, extra = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra });
  res.end(JSON.stringify(obj));
}
function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let s = "";
    req.on("data", c => { s += c; if (s.length > 20000) { falha(new Error("grande")); req.destroy(); } });
    req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { falha(new Error("json")); } });
  });
}
const limpa = (t, max) => String(t || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

const TIPOS = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css", ".svg":"image/svg+xml",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon", ".json":"application/json",
  ".webmanifest":"application/manifest+json" };
const PUBLICOS = new Set(["/index.html", "/menu.js", "/cozinha.html", "/mesas.html", "/painel.html",
  "/app.js", "/app.css", "/sw.js", "/manifest.webmanifest"]);

function servirArquivo(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  if (p === "/cozinha") p = "/cozinha.html";
  if (p === "/mesas") p = "/mesas.html";
  if (p === "/painel") p = "/painel.html";
  if (!PUBLICOS.has(p) && !/^\/(img|icons)\/[\w.-]+$/.test(p)) { res.writeHead(404); return res.end("Não encontrado"); }
  const arq = path.join(ROOT, p);
  fs.readFile(arq, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Não encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq).toLowerCase()] || "application/octet-stream",
      "Cache-Control": /^\/(img|icons)\//.test(p) ? "public, max-age=86400" : "no-cache" });
    res.end(buf);
  });
}

const ativos = () => ({
  pedidos: db.pedidos.filter(p => !p.fechado),
  chamados: db.chamados.filter(c => !c.atendido),
  garcons: db.garcons.filter(g => g.ativo),
  mesas: db.mesas,
  ajustes: db.ajustes
});

// Resumo de uma mesa aberta: o que entra na conta
function resumoMesa(mesa) {
  const pedidos = db.pedidos.filter(p => p.mesa === mesa && !p.fechado);
  const itensTotal = pedidos.reduce((s, p) => s + p.itens.reduce((t, i) => t + i.q * (i.p || 0), 0), 0);
  return {
    mesa, pedidos: pedidos.length,
    itensTotal: Math.round(itensTotal * 100) / 100,
    temRodizio: pedidos.some(p => p.modo === "rodizio"),
    garcom: db.mesas[mesa]?.garcom || null,
    abertaEm: pedidos.length ? Math.min(...pedidos.map(p => p.criado)) : null
  };
}
const nomeGarcom = id => db.garcons.find(g => g.id === id)?.nome || null;

// ---------- Rotas ----------
const ultimoChamado = new Map(); // mesa -> horário
const ultimoPedido = new Map();

async function api(req, res, url) {
  const rota = req.method + " " + url.pathname;

  // ----- Cliente (mesa) -----
  if (rota === "POST /api/pedidos") {
    const b = await lerCorpo(req);
    const mesa = mesaValida(b.mesa, b.k);
    if (!mesa) return json(res, 403, { erro: "Mesa inválida. Escaneie o QR code da mesa novamente." });
    if (Date.now() - (ultimoPedido.get(mesa) || 0) < 5000) return json(res, 429, { erro: "Aguarde alguns segundos antes de enviar outro pedido." });
    const modo = b.modo === "rodizio" ? "rodizio" : "carta";
    if (!Array.isArray(b.itens) || !b.itens.length || b.itens.length > 40) return json(res, 400, { erro: "Pedido vazio." });
    const itens = [];
    for (const it of b.itens) {
      const n = limpa(it.n, 80), q = Math.min(20, Math.max(1, parseInt(it.q) || 0));
      const rod = modo === "rodizio" && RODIZIO_ITENS.has(n);
      if (!rod && !PRECOS.has(n)) return json(res, 400, { erro: `Item desconhecido: ${n}` });
      itens.push({ n, q, p: rod ? 0 : PRECOS.get(n), rodizio: rod });
    }
    const pedido = { id: nextId(), mesa, modo, itens, obs: limpa(b.obs, 200), status: "novo", criado: Date.now() };
    db.pedidos.push(pedido); save(); ultimoPedido.set(mesa, Date.now());
    avisar("pedido", pedido);
    return json(res, 201, { ok: true, id: pedido.id });
  }

  if (rota === "POST /api/chamados") {
    const b = await lerCorpo(req);
    const mesa = mesaValida(b.mesa, b.k);
    if (!mesa) return json(res, 403, { erro: "Mesa inválida." });
    const tipo = b.tipo === "conta" ? "conta" : "garcom";
    if (Date.now() - (ultimoChamado.get(mesa) || 0) < 30000) return json(res, 429, { erro: "Já avisamos a equipe. Aguarde um instante 🙂" });
    const ch = { id: nextId(), mesa, tipo, criado: Date.now(), atendido: false };
    db.chamados.push(ch); save(); ultimoChamado.set(mesa, Date.now());
    avisar("chamado", ch);
    return json(res, 201, { ok: true });
  }

  if (rota === "GET /api/mesa") {
    const mesa = mesaValida(url.searchParams.get("mesa"), url.searchParams.get("k"));
    if (!mesa) return json(res, 403, { erro: "Mesa inválida." });
    const pedidos = db.pedidos.filter(p => p.mesa === mesa && !p.fechado)
      .map(({ id, itens, status, criado, modo }) => ({ id, itens, status, criado, modo }));
    return json(res, 200, { mesa, pedidos });
  }

  // ----- Equipe -----
  if (rota === "POST /api/login") {
    // atrás do proxy da hospedagem, o IP real do aparelho vem em x-forwarded-for
    const ip = (process.env.RENDER && String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress;
    const t = tentativas.get(ip) || { n: 0, ate: 0 };
    if (t.ate > Date.now()) return json(res, 429, { erro: "Muitas tentativas. Aguarde 1 minuto." });
    const b = await lerCorpo(req);
    const role = pinIgual(b.pin, PIN_GERENTE) ? "gerente" : pinIgual(b.pin, PIN) ? "equipe" : null;
    if (!role) {
      t.n++; if (t.n >= 5) { t.n = 0; t.ate = Date.now() + 60000; }
      tentativas.set(ip, t);
      return json(res, 401, { erro: "PIN incorreto." });
    }
    tentativas.delete(ip);
    const s = crypto.randomBytes(24).toString("hex"); sessoes.set(s, role);
    const seguro = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
    return json(res, 200, { ok: true, papel: role }, { "Set-Cookie": `sb_sessao=${s}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${seguro}` });
  }

  // usado pelo app para manter o servidor gratuito acordado enquanto a cozinha está aberta
  if (rota === "GET /api/ping") return json(res, 200, { ok: true });

  if (rota === "POST /api/logout") {
    const m = /(?:^|;\s*)sb_sessao=([a-f0-9]{48})/.exec(req.headers.cookie || "");
    if (m) sessoes.delete(m[1]);
    return json(res, 200, { ok: true }, { "Set-Cookie": "sb_sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
  }

  const quem = papel(req);
  if (!quem) return json(res, 401, { erro: "Faça login com o PIN." });
  const gerente = quem === "gerente";

  if (rota === "GET /api/painel") return json(res, 200, { ...ativos(), papel: quem });

  if (rota === "GET /api/stream") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write(`event: tudo\ndata: ${JSON.stringify(ativos())}\n\n`);
    ouvintes.add(res);
    req.on("close", () => ouvintes.delete(res));
    return;
  }

  let m;
  if (req.method === "POST" && (m = /^\/api\/pedidos\/(\d+)\/status$/.exec(url.pathname))) {
    const b = await lerCorpo(req);
    const p = db.pedidos.find(x => x.id === Number(m[1]));
    if (!p) return json(res, 404, { erro: "Pedido não encontrado." });
    if (!["novo", "preparo", "pronto", "entregue"].includes(b.status)) return json(res, 400, { erro: "Status inválido." });
    if (b.status === "entregue") {
      // quem serviu fica registrado no pedido e vira o responsável pela mesa (comissão)
      const g = db.garcons.find(x => x.id === Number(b.garcom) && x.ativo);
      if (!g) return json(res, 400, { erro: "Escolha o garçom que serviu o pedido." });
      p.garcom = g.id;
      if (!db.mesas[p.mesa]) db.mesas[p.mesa] = { garcom: g.id, desde: Date.now() };
      avisar("mesas", db.mesas);
    }
    p.status = b.status; p.atualizado = Date.now(); save();
    avisar("pedido", p);
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && (m = /^\/api\/chamados\/(\d+)\/atendido$/.exec(url.pathname))) {
    const c = db.chamados.find(x => x.id === Number(m[1]));
    if (!c) return json(res, 404, { erro: "Chamado não encontrado." });
    c.atendido = true; save();
    avisar("chamado", c);
    return json(res, 200, { ok: true });
  }

  if (rota === "GET /api/mesa-resumo") {
    const mesa = Number(url.searchParams.get("mesa"));
    if (!Number.isInteger(mesa) || mesa < 1) return json(res, 400, { erro: "Mesa inválida." });
    return json(res, 200, resumoMesa(mesa));
  }

  // Conta fechada: registra o faturamento, o garçom responsável e libera a mesa
  if (rota === "POST /api/contas") {
    const b = await lerCorpo(req);
    const mesa = Number(b.mesa);
    if (!Number.isInteger(mesa) || mesa < 1 || mesa > 200) return json(res, 400, { erro: "Mesa inválida." });
    const r = resumoMesa(mesa);
    const garcom = db.garcons.find(g => g.id === Number(b.garcom));
    if (!garcom) return json(res, 400, { erro: "Escolha o garçom responsável pela mesa." });
    const pessoas = Math.min(50, Math.max(0, parseInt(b.rodizioPessoas) || 0));
    const valorPessoa = Math.min(1000, Math.max(0, Number(b.rodizioValor) || 0));
    const ajuste = Math.min(5000, Math.max(-5000, Number(b.ajuste) || 0));
    const pagamentos = ["pix", "credito", "debito", "dinheiro"];
    const pagamento = pagamentos.includes(b.pagamento) ? b.pagamento : null;
    if (!pagamento) return json(res, 400, { erro: "Escolha a forma de pagamento." });
    const rodizioTotal = Math.round(pessoas * valorPessoa * 100) / 100;
    const total = Math.round((r.itensTotal + rodizioTotal + ajuste) * 100) / 100;
    if (total <= 0) return json(res, 400, { erro: "A conta está zerada. Confira os valores." });
    const conta = {
      id: nextId(), mesa, garcom: garcom.id, garcomNome: garcom.nome,
      pedidos: r.pedidos, itensTotal: r.itensTotal, rodizioPessoas: pessoas, rodizioValor: valorPessoa, rodizioTotal,
      ajuste, total, pagamento, comissaoPct: db.ajustes.comissao,
      comissao: Math.round(total * db.ajustes.comissao) / 100,
      abertaEm: r.abertaEm || Date.now(), fechadaEm: Date.now()
    };
    db.contas.push(conta);
    db.pedidos.forEach(p => { if (p.mesa === mesa && !p.fechado) { p.fechado = true; p.conta = conta.id; } });
    db.chamados.forEach(c => { if (c.mesa === mesa) c.atendido = true; });
    delete db.mesas[mesa];
    // histórico de pedidos e chamados: guarda 400 dias (as contas ficam para sempre)
    const limite = Date.now() - 400 * 864e5;
    db.pedidos = db.pedidos.filter(p => p.criado > limite || !p.fechado);
    db.chamados = db.chamados.filter(c => c.criado > Date.now() - 30 * 864e5);
    save();
    avisar("tudo", ativos());
    return json(res, 201, { ok: true, conta });
  }

  // ----- Garçons -----
  if (rota === "GET /api/garcons") return json(res, 200, { garcons: db.garcons.filter(g => g.ativo) });

  if (rota === "POST /api/garcons") {
    if (!gerente) return json(res, 403, { erro: "Só o gerente pode cadastrar garçons." });
    const b = await lerCorpo(req);
    const nome = limpa(b.nome, 40);
    if (nome.length < 2) return json(res, 400, { erro: "Digite o nome do garçom." });
    if (db.garcons.some(g => g.ativo && g.nome.toLowerCase() === nome.toLowerCase())) return json(res, 400, { erro: "Já existe um garçom com esse nome." });
    const g = { id: nextId(), nome, ativo: true, criado: Date.now() };
    db.garcons.push(g); save();
    avisar("tudo", ativos());
    return json(res, 201, { ok: true, garcom: g });
  }

  if (req.method === "POST" && (m = /^\/api\/garcons\/(\d+)\/remover$/.exec(url.pathname))) {
    if (!gerente) return json(res, 403, { erro: "Só o gerente pode remover garçons." });
    const g = db.garcons.find(x => x.id === Number(m[1]));
    if (!g) return json(res, 404, { erro: "Garçom não encontrado." });
    g.ativo = false; save(); // o histórico de vendas dele continua nas métricas
    avisar("tudo", ativos());
    return json(res, 200, { ok: true });
  }

  // ----- Gerente: ajustes e métricas -----
  if (rota === "POST /api/ajustes") {
    if (!gerente) return json(res, 403, { erro: "Só o gerente pode alterar os ajustes." });
    const b = await lerCorpo(req);
    const comissao = Number(b.comissao), rodizio = Number(b.rodizio);
    if (!(comissao >= 0 && comissao <= 50)) return json(res, 400, { erro: "Comissão deve ficar entre 0% e 50%." });
    if (!(rodizio > 0 && rodizio <= 1000)) return json(res, 400, { erro: "Valor do rodízio inválido." });
    db.ajustes = { comissao, rodizio }; save();
    avisar("tudo", ativos());
    return json(res, 200, { ok: true, ajustes: db.ajustes });
  }

  if (rota === "GET /api/metricas") {
    if (!gerente) return json(res, 403, { erro: "Só o gerente pode ver as métricas." });
    const de = Number(url.searchParams.get("de")) || 0;
    const ate = Number(url.searchParams.get("ate")) || Date.now();
    const contas = db.contas.filter(c => c.fechadaEm >= de && c.fechadaEm <= ate);
    const pedidos = db.pedidos.filter(p => p.criado >= de && p.criado <= ate)
      .map(({ id, mesa, modo, itens, garcom, criado, status }) => ({ id, mesa, modo, itens, garcom, criado, status }));
    return json(res, 200, { contas, pedidos, garcons: db.garcons, ajustes: db.ajustes });
  }

  if (rota === "GET /api/mesas-links") {
    if (!gerente) return json(res, 403, { erro: "Só o gerente pode gerar os QR codes." });
    const n = Math.min(200, Math.max(1, parseInt(url.searchParams.get("n")) || 10));
    // RENDER_EXTERNAL_URL é preenchida automaticamente pelo Render (https://....onrender.com)
    const base = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://${req.headers.host}`).replace(/\/$/, "");
    const links = Array.from({ length: n }, (_, i) => ({ mesa: i + 1, url: `${base}/?mesa=${i + 1}&k=${tableKey(i + 1)}` }));
    return json(res, 200, { base, links });
  }

  return json(res, 404, { erro: "Rota não encontrada." });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    servirArquivo(req, res, url);
  } catch (e) {
    json(res, 400, { erro: "Requisição inválida." });
  }
});

carregarDb().then(origem => servidor.listen(PORT, () => {
  console.log(`Dados em: ${origem}`);
  console.log(`Subarashi rodando em http://localhost:${PORT}`);
  console.log(`Cozinha/garçom: http://localhost:${PORT}/cozinha   ·   QR codes: http://localhost:${PORT}/mesas`);
  console.log(`Painel do gerente: http://localhost:${PORT}/painel`);
  if (!process.env.PIN) console.log("⚠  Usando PIN padrão da equipe (1234). Defina a variável PIN antes de usar no restaurante.");
  if (!process.env.PIN_GERENTE) console.log("⚠  Usando PIN padrão do gerente (9876). Defina a variável PIN_GERENTE antes de usar no restaurante.");
})).catch(e => { console.error("Não consegui carregar os dados:", e.message); process.exit(1); });
