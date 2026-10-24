/* Página Casual: escolha do jogo, abas "Pokémon / Time sugerido / Guia da história". Usa as funções do app.js. */
(function () {
  "use strict";
  if (typeof PAGE === "undefined" || PAGE !== "casual") return;
  const CASUAL_VERSION = "4.5";
  if (APP_VERSION !== CASUAL_VERSION) showErr("O casual.js está em outra versão (" + CASUAL_VERSION + "). Envie todos os arquivos juntos e aperte Ctrl+F5.");

  const STARTERS = {
    rb: ["bulbasaur", "charmander", "squirtle"], y: ["pikachu"], gs: ["chikorita", "cyndaquil", "totodile"], c: ["chikorita", "cyndaquil", "totodile"],
    rs: ["treecko", "torchic", "mudkip"], e: ["treecko", "torchic", "mudkip"], frlg: ["bulbasaur", "charmander", "squirtle"],
    dp: ["turtwig", "chimchar", "piplup"], pt: ["turtwig", "chimchar", "piplup"], hgss: ["chikorita", "cyndaquil", "totodile"],
    bw: ["snivy", "tepig", "oshawott"], b2w2: ["snivy", "tepig", "oshawott"], xy: ["chespin", "fennekin", "froakie"], oras: ["treecko", "torchic", "mudkip"],
    sm: ["rowlet", "litten", "popplio"], usum: ["rowlet", "litten", "popplio"], lg: ["pikachu", "eevee"], swsh: ["grookey", "scorbunny", "sobble"],
    bdsp: ["turtwig", "chimchar", "piplup"], pla: ["rowlet", "cyndaquil", "oshawott"], sv: ["sprigatito", "fuecoco", "quaxly"]
  };
  const TABS = [["poke", "Pokémon"], ["team", "Time sugerido"], ["guide", "Guia da história"]];
  const RAW = id => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + id + ".png";
  const ART = id => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" + id + ".png";
  const TYPES = Object.keys(TC);
  const sum = a => a.reduce((x, y) => x + y, 0);

  // ---------- jogo e abas ----------
  if (!GROUPS.some(g => g.id === game)) game = "sv";
  if (!curGames.length) curGames = GROUPS.slice();
  let ctab = "poke";
  const qs = new URLSearchParams(location.search), tq = qs.get("t");
  if (!qs.get("p") && (tq === "time" || tq === "guia")) ctab = tq === "time" ? "team" : "guide";

  // Cores e Pokémon da capa de cada jogo (cartões próprios; as capas oficiais são opcionais, veja o LEIA-ME).
  const GART = {
    rb: ["#d62f3a", "#3f7fd6", [6, 9]], y: ["#f0c419", "#e8a000", [25]], gs: ["#d4a017", "#9aa5b1", [250, 249]], c: ["#3fc1c9", "#2b7fb4", [245]],
    rs: ["#b3202d", "#2b5fb4", [383, 382]], e: ["#2f9e57", "#1f6b3a", [384]], frlg: ["#e8622a", "#3fa129", [6, 3]], cxd: ["#6c5aa8", "#3b2f6b", [244, 249]],
    dp: ["#5b7fd6", "#e8a0c8", [483, 484]], pt: ["#8d96b0", "#4a5470", [487]], hgss: ["#d4a017", "#9aa5b1", [250, 249]],
    bw: ["#2b2b2b", "#d8dde8", [643, 644]], b2w2: ["#2b2b2b", "#d8dde8", [646]], xy: ["#3f7fd6", "#d62f3a", [716, 717]], oras: ["#b3202d", "#2b5fb4", [383, 382]],
    sm: ["#e8622a", "#6c5aa8", [791, 792]], usum: ["#e8622a", "#6c5aa8", [800]], lg: ["#f0c419", "#a9742f", [25, 133]], swsh: ["#3f7fd6", "#d62f3a", [888, 889]],
    bdsp: ["#5b7fd6", "#e8a0c8", [483, 484]], pla: ["#7a8f3a", "#4f5a28", [493]], sv: ["#e8352a", "#7a3fc4", [1007, 1008]]
  };
  const covers = {};      // opcional: capas/index.json -> { "sv": "sv.jpg", ... }
  let gOpen = false;
  function tile(g) {
    const a = GART[g.id] || ["#667", "#445", []], cv = covers[g.id] ? '<img class="cv" src="capas/' + esc(covers[g.id]) + '" alt="" onerror="this.remove()">' : "";
    return '<span class="gt" style="background:linear-gradient(135deg,' + a[0] + "," + a[1] + ')"><span class="gm">' + a[2].map(id => '<img class="mc" src="' + RAW(id) + '" data-fb="' + ART(id) + '" alt="" onerror="__pkImgFail(this)">').join("") + "</span>" + cv + "</span>";
  }
  function renderGameBar() {
    const g = GROUPS.find(x => x.id === game) || GROUPS[GROUPS.length - 1], gens = [...new Set(GROUPS.map(x => x.gen))];
    const panel = gOpen ? '<div class="gpick" role="listbox" aria-label="Escolher o jogo">' + gens.map(gn => '<div class="gg"><div class="mute ggh">Geração ' + gn + '</div><div class="ggrid">' + GROUPS.filter(x => x.gen === gn).map(x => '<button type="button" class="gtile' + (x.id === game ? " sel" : "") + '" role="option" aria-selected="' + (x.id === game) + '" data-gpick="' + x.id + '" title="' + esc(x.name) + '">' + tile(x) + '<span class="gl">' + esc(x.name) + "</span></button>").join("") + "</div></div>").join("") + "</div>" : "";
    $("gamebar").innerHTML = '<button type="button" id="gcur" class="gcur" aria-expanded="' + gOpen + '" aria-haspopup="listbox">' + tile(g) + '<span class="gcn"><small class="mute">Jogo (vale para tudo nesta página)</small><b>' + esc(g.name) + '</b><small class="mute">Geração ' + g.gen + '</small></span><span class="gcaret" aria-hidden="true">' + (gOpen ? "▴" : "▾") + "</span></button>" + panel;
  }
  function setGame(id) {
    game = id; gOpen = false; try { localStorage.setItem("pkgame", game); } catch (x) {}
    renderGameBar(); if (mon) { renderGame(); if (mode === "casual") renderTab(); } refreshPane();
  }
  function renderTabs() {
    $("ctabs").innerHTML = TABS.map(([k, l]) => '<button class="tab" role="tab" data-ct="' + k + '" aria-selected="' + (k === ctab) + '">' + l + "</button>").join("");
    TABS.forEach(([k]) => { $("pane-" + k).hidden = k !== ctab; });
  }
  function refreshPane() { if (ctab === "team") renderTeamPane(); else if (ctab === "guide") renderGuide(); }

  // ---------- Time sugerido ----------
  const FILTERS = { legend: true, finalOnly: true, starter: "" };
  let DEX = null, GAMES = null, sugg = [], suggIdx = 0, lastKey = "", POOL = [];

  async function loadData() {
    if (DEX === null) { try { DEX = (await j("data/pokedex.json")).d; GAMES = (await j("data/games.json")).g; } catch (e) { DEX = false; } }
    return DEX;
  }
  const rec = (id, r) => ({ id: +id, n: r[0], pn: r[1], t: r[2], s: r[3], bst: sum(r[3]), k: r[4], from: r[5], fin: r[6] });
  function makePool(ids) {
    const out = [];
    ids.forEach(id => {
      const r = DEX[id]; if (!r) return;
      const m = rec(id, r);
      if (m.k === 3) return;
      if (FILTERS.legend && (m.k === 1 || m.k === 2)) return;
      if (FILTERS.finalOnly && !m.fin) return;
      out.push(m);
    });
    return out.sort((a, b) => b.bst - a.bst);
  }
  function scoreTeam(members, TD) {
    let power = 0, fast = 0, bulky = 0, imm = 0, defPen = 0, off = 0, dup = 0;
    const count = {}, stab = new Set();
    members.forEach(m => {
      power += Math.max(0, Math.min(1.3, (m.bst - 330) / 270)) * 10;
      if (m.s[5] >= 90) fast++;
      if (m.s[0] + m.s[2] + m.s[4] >= 280) bulky++;
      m.t.forEach(t => { count[t] = (count[t] || 0) + 1; stab.add(t); });
    });
    TYPES.forEach(a => {
      let w = 0, r = 0;
      members.forEach(m => { const x = mulT(TD, m.t, a); if (x > 1) w++; else if (x === 0) { r++; imm++; } else if (x < 1) r++; });
      defPen += Math.max(0, w - r) * 3 + (w >= 3 ? 5 : 0) + (w >= 4 ? 5 : 0);
    });
    TYPES.forEach(d => { if ([...stab].some(a => TD[a].damage_relations.double_damage_to.some(x => x.name === d))) off++; });
    Object.values(count).forEach(c => { if (c > 2) dup += (c - 2) * 3; });
    return power + off * 2 - defPen - dup + Math.min(fast, 2) * 2 + Math.min(bulky, 2) * 1.5 + imm * 0.5;
  }
  function beam(pool, TD, forced) {
    const P = pool.slice(0, 100);
    if (forced && !P.some(x => x.id === forced.id)) P.push(forced);
    let beams = [forced ? [forced] : []];
    for (let step = forced ? 1 : 0; step < 6; step++) {
      const next = new Map();
      beams.forEach(b => P.forEach(c => {
        if (b.some(x => x.id === c.id)) return;
        const nb = b.concat([c]), key = nb.map(x => x.id).sort((x, y) => x - y).join(",");
        if (!next.has(key)) next.set(key, [nb, scoreTeam(nb, TD)]);
      }));
      beams = [...next.values()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(x => x[0]);
    }
    return beams.slice(0, 5);
  }
  function descend(id) {   // forma final da linha evolutiva dentro do jogo
    let cur = +id;
    for (let k = 0; k < 4; k++) { const nx = Object.keys(DEX).find(i => DEX[i][5] === cur && (GAMES[game] || []).includes(+i)); if (!nx) break; cur = +nx; }
    return cur;
  }
  function roleOf(s) { const [hp, atk, def, spa, spd, spe] = s; return (hp + def + spd >= 290 ? "Resistente" : spe >= 95 ? "Rápido" : "Equilibrado") + " · " + (atk >= spa ? "físico" : "especial"); }
  function summary(team, TD) {
    const bad = TYPES.filter(t => { const ms = team.map(m => mulT(TD, m.t, t)); return ms.filter(x => x > 1).length > ms.filter(x => x < 1).length; });
    const stab = new Set(team.flatMap(m => m.t)), off = TYPES.filter(d => [...stab].some(a => TD[a].damage_relations.double_damage_to.some(x => x.name === d))).length;
    return { bad, off, avg: Math.round(sum(team.map(m => m.bst)) / (team.length || 1)) };
  }
  const spr = id => '<img src="' + RAW(id) + '" data-fb="' + ART(id) + '" alt="" onerror="__pkImgFail(this)">';

  async function renderTeamPane() {
    const box = $("pane-team"), g = G();
    box.innerHTML = '<div class="card"><p class="mute" style="margin:0">Calculando…</p></div>';
    const [ok, TD] = await Promise.all([loadData(), typeData().catch(() => null)]);
    if (!ok || !TD) { box.innerHTML = '<div class="card"><h3>Time sugerido</h3><p class="mute" style="margin:0">Ainda não há dados da Pokédex dos jogos. Rode o workflow "Atualizar estatisticas" no GitHub (ele leva alguns minutos na primeira vez) e recarregue a página.</p></div>'; return; }
    const ids = GAMES[game] || [];
    if (!ids.length) { box.innerHTML = '<div class="card"><h3>Time sugerido · ' + esc(g.name) + '</h3><p class="mute" style="margin:0">Não tenho a lista de Pokémon deste jogo. Escolha outro jogo acima.</p></div>'; return; }
    POOL = makePool(ids);
    const starters = (STARTERS[game] || []).filter(n => Object.values(DEX).some(r => r[0] === n));
    if (FILTERS.starter && !starters.includes(FILTERS.starter)) FILTERS.starter = "";
    let forced = null;
    if (FILTERS.starter) { const sid = Object.keys(DEX).find(i => DEX[i][0] === FILTERS.starter), fid = sid && descend(sid); if (fid && DEX[fid]) forced = rec(fid, DEX[fid]); }
    const key = [game, FILTERS.legend, FILTERS.finalOnly, FILTERS.starter].join("|");
    if (key !== lastKey) { lastKey = key; suggIdx = 0; sugg = POOL.length + (forced ? 1 : 0) >= 6 ? beam(POOL, TD, forced) : []; }
    const filters = '<div class="filters"><label><input type="checkbox" data-csf="legend"' + (FILTERS.legend ? " checked" : "") + '> Sem lendários e míticos</label><label><input type="checkbox" data-csf="final"' + (FILTERS.finalOnly ? " checked" : "") + '> Só evoluções finais</label><label>Inicial: <select data-csf="starter"><option value="">Qualquer</option>' + starters.map(n => '<option value="' + n + '"' + (n === FILTERS.starter ? " selected" : "") + ">" + esc(pretty(n)) + "</option>").join("") + "</select></label></div>";
    const head = '<h3>Time sugerido · ' + esc(g.name) + '</h3><p class="mute" style="margin:0 0 4px">Um time equilibrado por tipos e stats, só com Pokémon que existem neste jogo. Ele não sabe <b>onde</b> nem <b>quando</b> cada um aparece na história: veja o guia ao lado.</p>';
    if (!sugg.length) { box.innerHTML = '<div class="card">' + head + filters + '<p class="mute">Poucos Pokémon passam nos filtros. Desmarque "Só evoluções finais" ou "Sem lendários".</p></div>'; return; }
    const team = sugg[suggIdx % sugg.length], s = summary(team, TD);
    const cards = team.map((m, i) => {
      const used = new Set(team.map(x => x.id)), base = team.filter((_, k) => k !== i);
      const alts = POOL.filter(c => !used.has(c.id)).slice(0, 60).map(c => [c, scoreTeam(base.concat([c]), TD)]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
      return '<div class="tc"><div class="top2">' + spr(m.id) + '<div class="tcn"><b>' + esc(pretty(m.n)) + '</b><div>' + m.t.map(badge).join("") + '</div><small class="mute">Stats base ' + m.bst + " · " + roleOf(m.s) + "</small></div>" + addBtn(m.pn, true) + '</div><div class="alts"><span class="mute">Trocar por:</span>' + alts.map(a => '<button class="chip" data-cswap="' + i + ":" + a.id + '">' + esc(pretty(a.n)) + "</button>").join("") + "</div></div>";
    }).join("");
    box.innerHTML = '<div class="card">' + head + filters + '<div class="tgrid">' + cards + '</div><div class="tsum"><b>Resumo:</b> média de stats base ' + s.avg + " · cobre " + s.off + "/18 tipos com golpes do mesmo tipo · " + (s.bad.length ? "atenção às fraquezas em comum: " + s.bad.map(badge).join("") : "sem fraquezas em comum, bom equilíbrio") + '</div><div class="gnav" style="margin:10px 0 0"><button class="chip on" data-csa>Adicionar este time ao meu time de aventura</button><button class="chip" data-csn>Outra sugestão (' + (suggIdx % sugg.length + 1) + "/" + sugg.length + ")</button></div></div>";
  }
  async function swapMember(i, id) {
    const TD = await typeData(), team = sugg[suggIdx % sugg.length].slice(), r = DEX[id]; if (!r) return;
    team[i] = rec(id, r); sugg[suggIdx % sugg.length] = team; renderTeamPane();
  }
  async function addAll() {
    const team0 = sugg[suggIdx % sugg.length]; if (!team0) return;
    if (team.length && !confirm("Substituir o time de aventura atual pelo time sugerido?")) return;
    team = []; saveTeam(); renderTeam();
    for (const m of team0) await addToTeam(m.pn);
    refreshAddButtons(); tmsg("Time sugerido adicionado!");
  }

  // ---------- Guia da história ----------
  const gKey = () => "pkguide-" + game;
  const gState = () => { try { return JSON.parse(localStorage.getItem(gKey())) || { here: "", got: {} }; } catch (e) { return { here: "", got: {} }; } };
  const gSave = st => { try { localStorage.setItem(gKey(), JSON.stringify(st)); } catch (e) {} };

  const openStg = {};
  function openSet(guide, st) { if (!openStg[game]) { openStg[game] = new Set(guide.etapas[0] ? [guide.etapas[0].id] : []); if (st.here) openStg[game].add(st.here); } return openStg[game]; }
  function updateCount() { const names = [...document.querySelectorAll("[data-gg]")].map(x => x.dataset.gg), uniq = new Set(names), got = [...uniq].filter(n => gState().got[n]).length, el = $("gn"); if (el) el.textContent = got; }
  async function renderGuide() {
    const box = $("pane-guide"), g = G();
    box.innerHTML = '<div class="card"><p class="mute" style="margin:0">Carregando…</p></div>';
    let guide = null; try { guide = await j("guia-" + game + ".json"); } catch (e) {}
    if (!guide || !Array.isArray(guide.etapas)) { box.innerHTML = '<div class="card"><h3>Guia da história · ' + esc(g.name) + '</h3><p class="mute" style="margin:0">Ainda não há guia para este jogo. Por enquanto existe um rascunho para <b>Scarlet / Violet</b>: escolha esse jogo acima. Para criar um guia novo, copie o arquivo <code>guia-sv.json</code> para <code>guia-' + esc(game) + '.json</code> e edite (o formato está no LEIA-ME).</p></div>'; return; }
    const TD = await typeData().catch(() => null), st = gState(), opened = openSet(guide, st);
    const flat = guide.etapas.flatMap(e => (e.pokemon || []).map(p => p.nome));
    const mons = await Promise.all(flat.map(n => fetchMon(n).catch(() => null)));
    const byName = {}; flat.forEach((n, i) => { byName[n] = mons[i]; });
    const total = new Set(flat).size, got = Object.keys(st.got).filter(n => st.got[n] && flat.includes(n)).length;
    const weakTo = t => TD && TD[t] ? TD[t].damage_relations.double_damage_from.map(x => x.name) : [];
    const stages = guide.etapas.map((e, si) => {
      const here = st.here === e.id;
      const ch = (e.desafios || []).map(d => '<div class="ch"><b>' + esc(d.nome) + '</b> <span class="mute">' + esc(d.tipoDesafio || "") + (d.local ? " · " + esc(d.local) : "") + "</span>" + (d.tipo ? " " + badge(d.tipo) + ' <span class="mute">fraco a:</span> ' + weakTo(d.tipo).map(badge).join("") : "") + "</div>").join("");
      const pk = (e.pokemon || []).map(p => {
        const m = byName[p.nome], name = m ? m.name : p.nome, isGot = !!st.got[p.nome];
        return '<div class="pk' + (isGot ? " got" : "") + '">' + (m ? spr(m.id) : "") + '<div class="pkb"><b>' + esc(m ? dispOf(m) : pretty(p.nome)) + "</b> " + (m ? m.types.map(t => badge(t.type.name)).join("") : "") + '<div class="mute pkw">' + esc(p.porque || "") + "</div>" + (p.onde ? '<div class="mute pkw">📍 ' + esc(p.onde) + "</div>" : "") + (p.evolucao ? '<div class="mute pkw">🔁 ' + esc(p.evolucao) + "</div>" : "") + '</div><div class="pka"><label class="mute"><input type="checkbox" data-gg="' + esc(p.nome) + '"' + (isGot ? " checked" : "") + "> Já peguei</label>" + (m ? addBtn(name, true) + '<button class="chip" data-gd="' + esc(name) + '">Detalhes</button>' : "") + "</div></div>";
      }).join("");
      return '<details class="stg" data-stg="' + esc(e.id) + '"' + (opened.has(e.id) ? " open" : "") + '><summary><b>' + esc(e.titulo) + '</b> <span class="mute">níveis ' + esc(e.niveis || "") + "</span>" + (here ? ' <span class="tg dlc">Você está aqui</span>' : "") + "</summary>" + (e.nota ? '<p class="mute" style="margin:6px 0">' + esc(e.nota) + "</p>" : "") + (ch ? '<div class="chs">' + ch + "</div>" : "") + pk + '<div style="margin-top:8px"><button class="chip' + (here ? " on" : "") + '" data-gh="' + esc(e.id) + '">' + (here ? "Você está aqui" : "Estou aqui") + "</button></div></details>";
    }).join("");
    box.innerHTML = '<div class="card"><h3>' + esc(guide.titulo || "Guia da história") + '</h3>' + (guide.rascunho ? '<div class="warn">' + esc(guide.aviso || "Rascunho: confira as informações no jogo.") + "</div>" : "") + '<p class="mute" style="margin:0 0 8px">Você já pegou <b id="gn">' + got + "</b> de " + total + " Pokémon deste guia.</p>" + stages + "</div>";
  }

  // ---------- eventos ----------
  document.addEventListener("click", e => {
    if (e.target.closest("#gcur")) { gOpen = !gOpen; renderGameBar(); return; }
    const gp = e.target.closest("[data-gpick]");
    if (gp) { setGame(gp.dataset.gpick); return; }
    if (gOpen && !e.target.closest("#gamebar")) { gOpen = false; renderGameBar(); }
    const ct = e.target.closest("[data-ct]");
    if (ct) { ctab = ct.dataset.ct; renderTabs(); refreshPane(); return; }
    if (e.target.closest("[data-n]")) { ctab = "poke"; renderTabs(); }
    const sw = e.target.closest("[data-cswap]");
    if (sw) { const [i, id] = sw.dataset.cswap.split(":"); swapMember(+i, +id); }
    if (e.target.closest("[data-csn]")) { suggIdx++; renderTeamPane(); }
    if (e.target.closest("[data-csa]")) addAll();
    const gh = e.target.closest("[data-gh]");
    if (gh) { if (openStg[game]) openStg[game].add(gh.dataset.gh); const st = gState(); st.here = st.here === gh.dataset.gh ? "" : gh.dataset.gh; gSave(st); renderGuide(); }
    const gd = e.target.closest("[data-gd]");
    if (gd) { ctab = "poke"; renderTabs(); show(gd.dataset.gd); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset && t.dataset.csf) { const k = t.dataset.csf; if (k === "legend") FILTERS.legend = t.checked; else if (k === "final") FILTERS.finalOnly = t.checked; else if (k === "starter") FILTERS.starter = t.value; renderTeamPane(); }
    if (t.dataset && t.dataset.gg) { const st = gState(), nm = t.dataset.gg; st.got[nm] = t.checked; gSave(st); document.querySelectorAll('[data-gg="' + nm + '"]').forEach(x => { x.checked = t.checked; const row = x.closest(".pk"); if (row) row.classList.toggle("got", t.checked); }); updateCount(); }
  });

  document.addEventListener("toggle", e => { const d = e.target; if (d && d.matches && d.matches("details.stg") && openStg[game]) { if (d.open) openStg[game].add(d.dataset.stg); else openStg[game].delete(d.dataset.stg); } }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && gOpen) { gOpen = false; renderGameBar(); const c = $("gcur"); if (c) c.focus(); } });
  j("capas/index.json").then(m => { if (m && typeof m === "object") { Object.assign(covers, m); renderGameBar(); } }).catch(() => {});
  renderGameBar(); renderTabs(); refreshPane();
})();
