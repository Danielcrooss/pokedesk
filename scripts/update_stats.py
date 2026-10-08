"""Baixa as estatisticas mensais do Smogon e salva versoes reduzidas em data/."""
import json, os, re, sys, urllib.request

BASE = "https://www.smogon.com/stats/"
# kind -> (padrao do arquivo, cutoffs de rating preferidos)
KINDS = {
    "singles": (r"^(gen9ou)-(\d+)\.json$", [1825, 1695, 1500, 0], 4),
    # VGC atual (Pokemon Champions) ou, se nao houver, o mais recente dos jogos principais
    "vgc": (r"^(gen9(?:champions)?vgc\d{4}reg[a-z]+)-(\d+)\.json$", [1630, 1760, 1500, 0], 4),
    # VGC dos jogos principais (Scarlet/Violet): procura ate 36 meses para tras
    "vgcsv": (r"^(gen9vgc\d{4}reg[a-z]+)-(\d+)\.json$", [1630, 1760, 1500, 0], 36),
}
LIMITS = {"Abilities": 3, "Items": 6, "Moves": 8, "Spreads": 5, "Teammates": 10}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "pokedesk-stats/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def months():
    html = get(BASE).decode("utf-8", "ignore")
    return sorted(set(re.findall(r'href="(\d{4}-\d{2})/"', html)), reverse=True)


def find(month, pattern, prefs):
    html = get(f"{BASE}{month}/chaos/").decode("utf-8", "ignore")
    found = [re.match(pattern, f) for f in re.findall(r'href="([^"]+\.json)"', html)]
    found = [m for m in found if m]
    if not found:
        return None
    # regulamento mais recente: compara por ano e letra, ignorando o prefixo do nome
    key = lambda n: re.search(r"(\d{4})reg([a-z]+)", n).groups() if re.search(r"\d{4}reg", n) else (n,)
    fmt = max({m.group(1) for m in found}, key=key)
    cuts = {int(m.group(2)) for m in found if m.group(1) == fmt}
    cut = next((c for c in prefs if c in cuts), max(cuts))
    return fmt, cut, f"{BASE}{month}/chaos/{fmt}-{cut}.json"


def trim(chaos):
    out = {}
    for name, p in chaos["data"].items():
        if p.get("Raw count", 0) < 20:
            continue
        entry = {
            key: {k: round(v, 3) for k, v in sorted(
                ((k, v) for k, v in p.get(key, {}).items() if v > 0),
                key=lambda x: -x[1])[:limit]}
            for key, limit in LIMITS.items()
        }
        entry["n"] = round(sum(p.get("Abilities", {}).values()) or 1, 3)
        out[name] = entry
    return out


SETS_URL = "https://pkmn.github.io/smogon/data/sets/"
STAT = {"hp": "PS", "atk": "Atq", "def": "Def", "spa": "SpA", "spd": "SpD", "spe": "Vel"}
SINGLES_FORMATS = ["gen9ubers", "gen9ou", "gen9uu", "gen9ru", "gen9nu", "gen9pu", "gen9zu"]


def txt(v):
    if not v:
        return ""
    if isinstance(v, list):
        return " / ".join(txt(x) for x in v if x)
    return str(v)


def evs_txt(v):
    if not v:
        return ""
    if isinstance(v, list):
        return "  ou  ".join(evs_txt(x) for x in v if x)
    return " / ".join(f"{n} {STAT.get(k, k)}" for k, n in v.items() if n)


def conv(name, s):
    return {
        "name": name,
        "moves": [txt(m) for m in s.get("moves", [])],
        "item": txt(s.get("item")),
        "ability": txt(s.get("ability")),
        "nature": txt(s.get("nature")),
        "evs": evs_txt(s.get("evs")),
        "tera": txt(s.get("teratypes") or s.get("teraTypes")),
        "ivs": ivs_txt(s.get("ivs")),
    }


def reg_key(f):
    m = re.search(r"(\d{4})reg([a-z]+)", f)
    return m.groups() if m else (f,)


def ivs_txt(v):
    if not v or not isinstance(v, dict):
        return ""
    return " / ".join(f"{n} {STAT.get(k, k)}" for k, n in v.items())


def collect(data):
    """Converte o arquivo do Smogon em {especie: [{tier, sets}]}.
    O arquivo da geracao e organizado como especie -> formato -> nome do set -> set,
    mas aceito tambem formato -> especie -> sets (detecta pela inicial maiuscula)."""
    species_first = any(k[:1].isupper() for k in data)
    if species_first:
        pairs = ((sp, tier, sets) for sp, tiers in data.items() if isinstance(tiers, dict) for tier, sets in tiers.items())
    else:
        pairs = ((sp, tier, sets) for tier, spmap in data.items() if isinstance(spmap, dict) for sp, sets in spmap.items())
    res = {}
    for species, tier, sets in pairs:
        if not isinstance(sets, dict):
            continue
        lst = []
        for name, s in sets.items():
            for item in (s if isinstance(s, list) else [s]):
                if isinstance(item, dict):
                    lst.append(conv(name, item))
        if lst:
            res.setdefault(species, []).append({"tier": tier, "sets": lst})
    return res


def strategies():
    """Sets do Smogon Strategy Dex por geracao e do Champions (sem os textos de analise, que tem autoria propria)."""
    os.makedirs("data/strategies", exist_ok=True)
    available = []
    sources = [(str(n), f"gen{n}") for n in range(1, 10)] + [("champions", "champions")]
    for label, fname in sources:
        try:
            res = collect(json.loads(get(f"{SETS_URL}{fname}.json")))
        except Exception as e:
            print(f"estrategias {fname}: erro {e}", file=sys.stderr)
            continue
        tiers = sorted({g["tier"] for lst in res.values() for g in lst})
        print(f"estrategias {fname}: {len(res)} pokemon, {len(tiers)} formatos")
        if res:
            with open(f"data/strategies/{label}.json", "w", encoding="utf-8") as fh:
                json.dump({"gen": label, "data": res}, fh, ensure_ascii=False, separators=(",", ":"))
            available.append(label)
    with open("data/strategies/index.json", "w", encoding="utf-8") as fh:
        json.dump({"gens": available}, fh)


RAND_STATS = "https://pkmn.github.io/randbats/data/stats/gen9randombattle.json"
RAND_SETS = "https://pkmn.github.io/randbats/data/gen9randombattle.json"


def top_keys(d, n):
    if isinstance(d, dict):
        ranked = sorted(d.items(), key=lambda x: -(x[1] if isinstance(x[1], (int, float)) else 0))
        return [str(k) for k, _ in ranked[:n]]
    if isinstance(d, list):
        return [str(x) for x in d[:n]]
    return []


def casual_data():
    """Papeis do Random Battle (golpes, habilidades, itens, Tera) para a aba Casual."""
    out = {}
    try:
        for name, p in json.loads(get(RAND_STATS)).items():
            roles = p.get("roles")
            if not isinstance(roles, dict):
                continue
            lst = [{"role": role, "abilities": top_keys(r.get("abilities", {}), 3),
                    "items": top_keys(r.get("items", {}), 3), "tera": top_keys(r.get("teraTypes", {}), 3),
                    "moves": top_keys(r.get("moves", {}), 8)}
                   for role, r in roles.items() if isinstance(r, dict)]
            if lst:
                out[name] = {"level": p.get("level"), "roles": lst}
    except Exception as e:
        print(f"casual (stats): erro {e}", file=sys.stderr)
    if not out:
        for name, p in json.loads(get(RAND_SETS)).items():
            lst = [{"role": s.get("role", ""), "abilities": top_keys(s.get("abilities", []), 3), "items": [],
                    "tera": top_keys(s.get("teraTypes", []), 3), "moves": top_keys(s.get("movepool", []), 10)}
                   for s in (p.get("sets") or [])]
            if lst:
                out[name] = {"level": p.get("level"), "roles": lst}
    with open("data/casual.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"casual: {len(out)} pokemon")


def main():
    os.makedirs("data", exist_ok=True)
    ok = 0
    all_months = months()
    for kind, (pattern, prefs, back) in KINDS.items():
        for month in all_months[:back]:
            try:
                res = find(month, pattern, prefs)
                if not res:
                    continue
                fmt, cut, url = res
                print(f"{kind}: {url}")
                chaos = json.loads(get(url))
                payload = {"format": fmt, "month": month, "cutoff": cut, "data": trim(chaos)}
                with open(f"data/{kind}.json", "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
                ok += 1
                break
            except Exception as e:
                print(f"{kind} {month}: erro {e}", file=sys.stderr)
    try:
        casual_data()
    except Exception as e:
        print(f"casual: erro {e}", file=sys.stderr)
    try:
        strategies()
    except Exception as e:
        print(f"estrategias: erro {e}", file=sys.stderr)
    if ok == 0:
        sys.exit("Nenhum arquivo gerado")


if __name__ == "__main__":
    main()
