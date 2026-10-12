(function () {
  "use strict";
  const VERSION = "4.0";
  // Links de time compartilhados antes da divisão em páginas apontavam para o início: levar ao Competitivo.
  if (location.hash.indexOf("#t=") === 0) { location.replace("competitivo.html" + location.hash); return; }

  const $ = id => document.getElementById(id);
  const POKEAPI = "https://pokeapi.co/api/v2";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const slug = s => String(s).trim().toLowerCase().replace(/['’.]/g, "").replace(/\s+/g, "-");
  const pretty = s => String(s).split("-").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  const cache = new Map();
  const j = async u => { if (cache.has(u)) return cache.get(u); const r = await fetch(u); if (!r.ok) throw new Error(r.status); const d = await r.json(); cache.set(u, d); return d; };
  const AREA = { comp: ["competitivo.html", "Competitivo"], casual: ["casual.html", "Casual"] };

  const showErr = m => { const b = $("errbar"); if (b && m) { b.hidden = false; b.textContent = "Ops, algo deu errado: " + m + " (clique para fechar)."; b.onclick = () => { b.hidden = true; }; } };
  window.addEventListener("error", e => showErr(e.message));
  window.addEventListener("unhandledrejection", e => showErr((e.reason && e.reason.message) || String(e.reason)));
  if (document.body.dataset.v && document.body.dataset.v !== VERSION) showErr("Os arquivos do site estão em versões diferentes. Envie todos os arquivos juntos e aperte Ctrl+F5.");

  // ---- busca ----
  let lastArea = "comp";
  try { const l = JSON.parse(localStorage.getItem("pklast")); if (l && AREA[l.area]) lastArea = l.area; } catch (e) {}
  const go = area => { const v = slug($("q").value); if (!v) { $("q").focus(); return; } location.href = AREA[area][0] + "?p=" + encodeURIComponent(v); };
  $("q").addEventListener("keydown", e => { if (e.key === "Enter") go(lastArea); });
  document.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) go(b.dataset.go); });
  j(POKEAPI + "/pokemon?limit=1100").then(d => { $("names").innerHTML = d.results.map(r => '<option value="' + esc(pretty(r.name)) + '">').join(""); }).catch(() => {});

  // ---- continuar de onde parou ----
  (function resume() {
    const parts = [];
    try {
      const l = JSON.parse(localStorage.getItem("pklast"));
      if (l && l.name && AREA[l.area]) parts.push('<div class="resume">Continuar: <a href="' + AREA[l.area][0] + "?p=" + encodeURIComponent(l.name) + '"><b>' + esc(pretty(l.name)) + "</b> no " + AREA[l.area][1] + " →</a></div>");
    } catch (e) {}
    try {
      const td = JSON.parse(localStorage.getItem("pkteams2"));
      [["comp", "Time competitivo"], ["casual", "Time da aventura"]].forEach(([area, label]) => {
        const kind = area === "casual" ? "aventura" : "comp";
        let t = td && td.list && td.list.find(x => td.last && x.id === td.last[kind] && (x.kind || "comp") === kind && x.members && x.members.length);
        if (!t && td && td.list) t = td.list.find(x => (x.kind || "comp") === kind && x.members && x.members.length);
        if (t) parts.push('<div class="resume"><span class="mute">' + label + ":</span> <a href=\"" + AREA[area][0] + '"><b>' + esc(t.name) + "</b></a>" + t.members.map(m => '<img src="' + esc(m.sprite || "") + '" alt="" title="' + esc(pretty(m.name)) + '">').join("") + "</div>");
      });
    } catch (e) {}
    $("resume").innerHTML = parts.length ? '<div class="card"><h3>Continue de onde parou</h3>' + parts.join("") + "</div>" : "";
  })();

  // ---- mais usados do mês (dados gerados pelo robô) ----
  const FM = [["vgc", "VGC Champions"], ["vgcsv", "VGC Scarlet/Violet"], ["singles", "Singles"]];
  let cur = "vgc";
  $("topnav").innerHTML = FM.map(([k, l]) => '<button class="chip' + (k === cur ? " on" : "") + '" data-top="' + k + '">' + l + "</button>").join("");
  async function top(k) {
    cur = k;
    document.querySelectorAll("[data-top]").forEach(b => b.classList.toggle("on", b.dataset.top === k));
    $("top10").innerHTML = '<p class="mute">Carregando…</p>'; $("topinfo").textContent = "";
    let raw; try { raw = await j("data/" + k + ".json"); } catch (e) { $("top10").innerHTML = '<p class="mute" style="margin:0">Ainda não há dados deste formato. Rode o workflow no GitHub.</p>'; return; }
    const list = Object.entries(raw.data || {}).map(([n, v]) => [n, v.n || 0]).sort((a, b) => b[1] - a[1]).slice(0, 10), mx = (list[0] && list[0][1]) || 1;
    const mons = await Promise.all(list.map(([n]) => j(POKEAPI + "/pokemon/" + slug(n)).catch(() => null)));
    if (cur !== k) return;
    $("top10").innerHTML = list.map(([n, v], i) => '<div class="trk"><span class="mute">' + (i + 1) + '</span><span>' + (mons[i] && mons[i].sprites.front_default ? '<img src="' + esc(mons[i].sprites.front_default) + '" alt="">' : "") + '</span><a href="competitivo.html?p=' + encodeURIComponent(slug(n)) + "&f=" + k + '">' + esc(n) + '</a><div class="bar"><i style="width:' + Math.round(v / mx * 100) + '%"></i></div></div>').join("") || '<p class="mute" style="margin:0">Sem dados.</p>';
    $("topinfo").textContent = "Ranking de uso no formato " + raw.format + ", " + raw.month + " (Smogon). A barra compara com o primeiro colocado.";
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-top]"); if (b) top(b.dataset.top); });
  top(cur);

  $("foot").innerHTML = '<b>Créditos</b> <span id="ver">· versão: etapa 4 (páginas separadas)</span><br>Estatísticas de uso, sets e estratégias: <a href="https://www.smogon.com" target="_blank" rel="noopener">Smogon</a> (<a href="https://www.smogon.com/stats/" target="_blank" rel="noopener">stats</a> e <a href="https://www.smogon.com/dex/" target="_blank" rel="noopener">Strategy Dex</a>), reunidos em formato aberto pelo projeto <a href="https://github.com/pkmn" target="_blank" rel="noopener">pkmn</a>. Sets do Random Battle e sprites animados: <a href="https://play.pokemonshowdown.com" target="_blank" rel="noopener">Pokémon Showdown</a>. Pokémon, golpes, itens, locais e imagens: <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a>. Tradução automática: <a href="https://mymemory.translated.net" target="_blank" rel="noopener">MyMemory</a>.<br>Projeto de fã, não oficial e sem vínculo com Nintendo, Game Freak, The Pokémon Company ou Smogon. Pokémon e seus nomes são marcas dos respectivos donos.';
})();
