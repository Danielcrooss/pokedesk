"""Baixa as estatisticas mensais do Smogon e salva versoes reduzidas em data/."""
import json, os, re, sys, urllib.request

BASE = "https://www.smogon.com/stats/"
# kind -> (padrao do arquivo, cutoffs de rating preferidos)
KINDS = {
    "singles": (r"^(gen9ou)-(\d+)\.json$", [1825, 1695, 1500, 0]),
    "vgc": (r"^(gen9vgc\d{4}reg[a-z]+)-(\d+)\.json$", [1760, 1630, 1500, 0]),
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
    fmt = max(m.group(1) for m in found)  # regulamento mais recente
    cuts = {int(m.group(2)) for m in found if m.group(1) == fmt}
    cut = next((c for c in prefs if c in cuts), max(cuts))
    return fmt, cut, f"{BASE}{month}/chaos/{fmt}-{cut}.json"


def trim(chaos):
    out = {}
    for name, p in chaos["data"].items():
        if p.get("Raw count", 0) < 100:
            continue
        out[name] = {
            key: {k: round(v, 3) for k, v in sorted(
                ((k, v) for k, v in p.get(key, {}).items() if v > 0),
                key=lambda x: -x[1])[:limit]}
            for key, limit in LIMITS.items()
        }
    return out


def main():
    os.makedirs("data", exist_ok=True)
    ok = 0
    recent = months()[:4]
    for kind, (pattern, prefs) in KINDS.items():
        for month in recent:
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
    if ok == 0:
        sys.exit("Nenhum arquivo gerado")


if __name__ == "__main__":
    main()
