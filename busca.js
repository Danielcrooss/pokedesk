/* Busca de Pokémon (compartilhada pelas três páginas). Uso: PokeSearch.attach(input, { onSelect(nome), onSubmit(texto) }) */
(function () {
  "use strict";
  const VERSION = "4.5";
  const POKEAPI = "https://pokeapi.co/api/v2";
  const SPR = id => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + id + ".png";
  const TC = { normal: "#9fa19f", fire: "#e8622a", water: "#4592e6", electric: "#e8b800", grass: "#3fa129", ice: "#3dcef3", fighting: "#d3425f", poison: "#9f5bd0", ground: "#a97a4a", flying: "#7fa4e8", psychic: "#ee6b7a", bug: "#8fa31b", rock: "#b8a86e", ghost: "#6c5aa8", dragon: "#4f60e2", dark: "#5b5466", steel: "#5a8ea5", fairy: "#ee90e6" };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pretty = s => String(s).split("-").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const isSub = (k, n) => { let i = 0; for (let c = 0; c < k.length && i < n.length; c++) if (k[c] === n[i]) i++; return i === n.length; };

  // ---- lista de nomes (guardada no navegador por 7 dias) ----
  const KEY = "pknames2";
  let all = [], listeners = [];
  const mk = (n, id, base, merged) => ({ n, id, base, p: pretty(base), k: norm(base), k2: norm(n), w: base.split("-").map(norm), merged });
  // A forma padrão mostra o nome da ESPÉCIE (Landorus, não "Landorus Incarnate"); macho/fêmea separados viram um resultado só.
  const build = (list, sp) => {
    sp = sp || {};
    const names = new Set(list.map(x => x[0])), out = [];
    list.forEach(([n, id]) => {
      const g = n.match(/^(.*)-(male|female)$/);
      if (g && names.has(g[1] + "-male") && names.has(g[1] + "-female")) { if (g[2] === "male") out.push(mk(n, id, sp[id] || g[1], true)); return; }
      out.push(mk(n, id, id <= 1025 && sp[id] ? sp[id] : n, false));
    });
    return out;
  };
  (function load() {
    let cached = null; try { cached = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (cached && Array.isArray(cached.list) && cached.list.length) all = build(cached.list, cached.sp);
    if (all.length && Date.now() - (cached.t || 0) < 7 * 864e5) return;
    const idOf = r => +String(r.url || "").split("/").filter(Boolean).pop() || 0;
    Promise.all([
      fetch(POKEAPI + "/pokemon?limit=1400").then(r => r.json()),
      fetch(POKEAPI + "/pokemon-species?limit=1100").then(r => r.json()).catch(() => ({ results: [] }))
    ]).then(([d, s]) => {
      const list = d.results.map(r => [r.name, idOf(r)]), sp = {};
      ((s && s.results) || []).forEach(r => { sp[idOf(r)] = r.name; });
      all = build(list, sp); try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), list, sp })); } catch (e) {}
      listeners.forEach(f => f());
    }).catch(() => {});
  })();

  function search(q) {
    const s = q.trim().replace(/^#/, ""), n = norm(s); if (!n) return [];
    const isNum = /^\d+$/.test(s), out = [];
    for (const it of all) {
      let sc = 0;
      if (isNum && String(it.id) === s) sc = 100;
      else if (it.k === n) sc = 90;
      else if (it.k2 === n) sc = 85;
      else if (it.k.indexOf(n) === 0) sc = 70;
      else if (it.k2.indexOf(n) === 0) sc = 65;
      else if (it.w.some(w => w.indexOf(n) === 0)) sc = 50;
      else if (it.k.indexOf(n) >= 0 || it.k2.indexOf(n) >= 0) sc = 30;
      else if (n.length >= 3 && isSub(it.k2, n)) sc = 10;
      if (sc) out.push([sc - (it.id > 1025 ? 5 : 0) - it.k.length / 100, it]);
    }
    return out.sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
  }

  const ART = id => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" + id + ".png";
  // Se a imagem padrão não existir, tenta a arte oficial e depois a imagem que a própria PokéAPI informa.
  const SD = x => "https://play.pokemonshowdown.com/sprites/dex/" + x + ".png";
  const PLACE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='9' fill='none' stroke='%238d96b0' stroke-width='1.5'/><path d='M3 12h18' stroke='%238d96b0' stroke-width='1.5'/><circle cx='12' cy='12' r='2.5' fill='%238d96b0'/></svg>";
  const fallbacks = it => [ART(it.id)].concat([...new Set([norm(it.base), it.n])].map(SD));
  window.__pkImgFail = img => { const l = (img.dataset.fb || "").split("|").filter(Boolean), n = l.shift(); img.dataset.fb = l.join("|"); if (n) img.src = n; else { img.onerror = null; img.dataset.dead = "1"; img.src = PLACE; } };
  const meta = {};
  function loadMeta(it, cb) {
    if (meta[it.id]) return cb(meta[it.id]);
    fetch(POKEAPI + "/pokemon/" + it.id).then(r => r.json()).then(p => {
      meta[it.id] = { types: p.types.map(t => t.type.name), sprite: (p.sprites && p.sprites.front_default) || (((p.sprites || {}).other || {})["official-artwork"] || {}).front_default || "" };
      cb(meta[it.id]);
    }).catch(() => {});
  }
  const badges = ts => ts.map(t => '<span class="tp mini" style="background:' + (TC[t] || "#667") + '">' + pretty(t) + "</span>").join("");

  function getRecent() { try { const r = JSON.parse(localStorage.getItem("pkrecent")); return Array.isArray(r) ? r : []; } catch (e) { return []; } }
  function addRecent(n) { try { localStorage.setItem("pkrecent", JSON.stringify([n].concat(getRecent().filter(x => x !== n)).slice(0, 8))); } catch (e) {} }

  function attach(input, opts) {
    opts = opts || {};
    input.removeAttribute("list");
    input.setAttribute("autocomplete", "off"); input.setAttribute("spellcheck", "false"); input.setAttribute("autocapitalize", "off");
    input.setAttribute("enterkeyhint", "search"); input.setAttribute("inputmode", "search");
    input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("aria-expanded", "false"); input.setAttribute("aria-controls", "slist-" + (input.id || "q"));
    input.placeholder = "Buscar Pokémon por nome ou número…";
    const wrap = document.createElement("div"); wrap.className = "sbox";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    wrap.insertAdjacentHTML("afterbegin", '<svg class="sico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>');
    const clear = document.createElement("button"); clear.type = "button"; clear.className = "sclear"; clear.setAttribute("aria-label", "Limpar busca"); clear.innerHTML = "×"; clear.hidden = true;
    const kbd = document.createElement("kbd"); kbd.textContent = "/"; kbd.title = "Atalho: aperte / para buscar";
    const list = document.createElement("div"); list.className = "slist"; list.id = "slist-" + (input.id || "q"); list.setAttribute("role", "listbox"); list.hidden = true;
    wrap.append(clear, kbd, list);

    let items = [], active = -1;
    const isOpen = () => !list.hidden;
    function close() { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
    function setActive(i) {
      active = i;
      list.querySelectorAll(".sitem").forEach((el, k) => el.setAttribute("aria-selected", String(k === i)));
      if (i >= 0) { const el = list.querySelectorAll(".sitem")[i]; if (el) { input.setAttribute("aria-activedescendant", el.id); if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); } }
    }
    function choose(it) { input.value = it.p; addRecent(it.n); close(); clear.hidden = !input.value; if (opts.onSelect) opts.onSelect(it.n, it); }
    function row(it, q, i) {
      const idx = q ? it.p.toLowerCase().indexOf(q.toLowerCase()) : -1;
      const name = idx >= 0 ? esc(it.p.slice(0, idx)) + "<b>" + esc(it.p.slice(idx, idx + q.length)) + "</b>" + esc(it.p.slice(idx + q.length)) : esc(it.p);
      return '<div class="sitem" role="option" id="so-' + list.id + "-" + i + '" data-i="' + i + '" aria-selected="false"><img src="' + SPR(it.id) + '" data-fb="' + esc(fallbacks(it).join("|")) + '" alt="" loading="lazy" onerror="__pkImgFail(this)"><div class="sn"><span>' + name + "</span><small>" + ((it.id && it.id <= 1025 ? "#" + String(it.id).padStart(4, "0") : "forma alternativa") + (it.merged ? " · ♂ ♀" : "")) + '</small></div><span class="stp"></span></div>';
    }
    function render() {
      const q = input.value.trim(); clear.hidden = !input.value; kbd.hidden = !!input.value;
      let html = "";
      if (!all.length) html = '<div class="snone">Carregando lista de Pokémon…</div>', items = [];
      else if (!q) {
        const rec = getRecent().map(n => all.find(x => x.n === n)).filter(Boolean);
        items = rec;
        if (!rec.length) { close(); return; }
        html = '<div class="shead"><span>Recentes</span><button type="button" class="slink" data-sclear>Limpar</button></div>' + rec.map((it, i) => row(it, "", i)).join("");
      } else {
        items = search(q);
        html = items.length ? items.map((it, i) => row(it, q, i)).join("") : '<div class="snone">Nenhum Pokémon encontrado para “' + esc(q) + "”.<br>Tente o nome em inglês ou o número da Pokédex.</div>";
      }
      list.innerHTML = html; list.hidden = false; input.setAttribute("aria-expanded", "true");
      active = items.length && q ? 0 : -1; setActive(active);
      list.querySelectorAll(".sitem").forEach((el, i) => loadMeta(items[i], mt => {
        const t = el.querySelector(".stp"); if (t) t.innerHTML = badges(mt.types);
        const im = el.querySelector("img"); if (im && mt.sprite) { if (im.dataset.dead) { im.dataset.dead = ""; im.src = mt.sprite; } else im.dataset.fb = mt.sprite + "|" + (im.dataset.fb || ""); }
      }));
    }
    listeners.push(() => { if (document.activeElement === input) render(); });

    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); if (!isOpen()) render(); else if (items.length) setActive((active + 1) % items.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (items.length) setActive((active - 1 + items.length) % items.length); }
      else if (e.key === "Escape") { if (isOpen()) { e.preventDefault(); close(); } }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (isOpen() && items[active >= 0 ? active : 0] && (input.value.trim() || active >= 0)) choose(items[active >= 0 ? active : 0]);
        else { close(); if (opts.onSubmit) opts.onSubmit(input.value); }
      } else if (e.key === "Tab") close();
    });
    list.addEventListener("mousedown", e => e.preventDefault());
    list.addEventListener("click", e => {
      if (e.target.closest("[data-sclear]")) { try { localStorage.removeItem("pkrecent"); } catch (x) {} render(); return; }
      const el = e.target.closest(".sitem"); if (el && items[+el.dataset.i]) choose(items[+el.dataset.i]);
    });
    list.addEventListener("mousemove", e => { const el = e.target.closest(".sitem"); if (el && +el.dataset.i !== active) setActive(+el.dataset.i); });
    clear.addEventListener("click", () => { input.value = ""; render(); input.focus(); });
    document.addEventListener("click", e => { if (!wrap.contains(e.target)) close(); });
    document.addEventListener("keydown", e => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); input.focus(); input.select(); }
    });
    clear.hidden = !input.value; kbd.hidden = !!input.value;
    return { close, render };
  }

  window.PokeSearch = { version: VERSION, attach };
})();
