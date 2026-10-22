// App Subarashi Gestão: navegação comum, instalação (celular e PC) e recursos de app.
// Incluído pelas telas internas: /cozinha, /painel e /mesas.
(function () {
  const ICONES = {
    pedidos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16M6 15a6 6 0 0 1 12 0M12 7V5M10 5h4"/></svg>',
    painel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
    instalar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/></svg>'
  };
  const pagina = location.pathname.replace(/\.html$/, "").replace(/^\/$/, "/cozinha");
  const instalado = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let papelAtual = null, pedidoInstalacao = null;

  // ---------- Service worker (necessário para instalar) ----------
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  // ---------- Barra de navegação ----------
  const nav = document.createElement("nav");
  nav.className = "appnav"; nav.setAttribute("aria-label", "Menu do app");
  nav.innerHTML = `
    <a href="/cozinha" data-pg="/cozinha">${ICONES.pedidos}<span>Pedidos</span></a>
    <a href="/painel" data-pg="/painel" data-gerente hidden>${ICONES.painel}<span>Painel</span></a>
    <a href="/mesas" data-pg="/mesas" data-gerente hidden>${ICONES.qr}<span>QR codes</span></a>
    <button type="button" data-instalar hidden>${ICONES.instalar}<span>Instalar app</span></button>
    <button type="button" class="sair" data-sair hidden>${ICONES.sair}<span>Sair</span></button>`;
  nav.querySelectorAll("[data-pg]").forEach(a => { if (a.dataset.pg === pagina) a.setAttribute("aria-current", "page"); });

  function montar() {
    const topo = document.querySelector(".top, .bar");
    if (topo && matchMedia("(min-width: 901px)").matches) {
      const h1 = topo.querySelector("h1"); h1 ? h1.after(nav) : topo.prepend(nav);
    } else document.body.append(nav);
  }
  addEventListener("resize", () => { if (nav.isConnected) montar(); });

  function atualizar() {
    nav.querySelectorAll("[data-gerente]").forEach(a => a.hidden = papelAtual !== "gerente");
    nav.querySelector("[data-sair]").hidden = !papelAtual;
    const semInstalar = instalado || !(pedidoInstalacao || iOS);
    nav.querySelector("[data-instalar]").hidden = semInstalar;
    // antes do login a barra só aparece se der para instalar o app
    nav.hidden = !papelAtual && semInstalar;
    document.body.classList.toggle("tem-appnav", !nav.hidden);
  }

  // ---------- Sair ----------
  nav.querySelector("[data-sair]").onclick = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    location.href = "/cozinha";
  };

  // ---------- Instalar (Android, Windows, Mac, Chromebook: prompt do navegador; iPhone: instruções) ----------
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); pedidoInstalacao = e; atualizar(); });
  addEventListener("appinstalled", () => { pedidoInstalacao = null; nav.querySelector("[data-instalar]").hidden = true; });
  nav.querySelector("[data-instalar]").onclick = async () => {
    if (pedidoInstalacao) { pedidoInstalacao.prompt(); await pedidoInstalacao.userChoice; pedidoInstalacao = null; atualizar(); return; }
    let s = document.querySelector(".instalar-sheet");
    if (!s) {
      s = document.createElement("div"); s.className = "instalar-sheet";
      s.innerHTML = `<div class="instalar-box" role="dialog" aria-modal="true" aria-label="Instalar no iPhone">
        <h3>Instalar no iPhone / iPad</h3>
        <ol><li>Abra este endereço no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
        <li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li></ol>
        <button type="button">Entendi</button></div>`;
      s.onclick = e => { if (e.target === s || e.target.tagName === "BUTTON") s.hidden = true; };
      document.body.append(s);
    }
    s.hidden = false;
  };

  // ---------- API usada pelas telas ----------
  window.SBApp = {
    // a tela avisa o papel depois do login ("equipe" | "gerente" | null)
    papel(p) { papelAtual = p || null; atualizar(); },
    // mantém a tela acesa (tablet da cozinha) enquanto o app estiver aberto
    async manterTelaLigada() {
      if (!("wakeLock" in navigator)) return;
      const pedir = async () => { try { await navigator.wakeLock.request("screen"); } catch {} };
      await pedir();
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pedir(); });
    },
    vibrar(padrao) { try { navigator.vibrate && navigator.vibrate(padrao); } catch {} },
    instalado
  };

  // Hospedagem gratuita dorme após 15 min sem acesso: enquanto o app estiver aberto, ele "cutuca" o servidor
  setInterval(() => { if (/^https?:$/.test(location.protocol)) fetch("/api/ping").catch(() => {}); }, 4 * 60 * 1000);

  const iniciar = () => {
    montar(); atualizar();
    // descobre o papel da sessão atual (se já estiver logado)
    if (/^https?:$/.test(location.protocol)) fetch("/api/painel").then(r => r.ok ? r.json() : null).then(d => window.SBApp.papel(d && d.papel)).catch(() => {});
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", iniciar) : iniciar();
})();
