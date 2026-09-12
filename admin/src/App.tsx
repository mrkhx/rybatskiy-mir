import { useEffect, useState } from "react";

type Tab = "overview" | "waters" | "species" | "items" | "players";

const LABELS: Record<Tab, string> = {
  overview: "Сводка",
  waters: "Водоёмы",
  species: "Рыбы",
  items: "Предметы",
  players: "Игроки",
};

const RARITY: Record<string, string> = {
  COMMON: "обычная",
  UNCOMMON: "необычная",
  RARE: "редкая",
  EPIC: "эпическая",
  LEGENDARY: "легендарная",
  LARGE: "крупная",
  TROPHY: "трофей",
  RECORD: "рекорд",
};

const KIND: Record<string, string> = {
  ROD: "удилище",
  REEL: "катушка",
  LINE: "леска",
  HOOK: "крючок",
  FLOAT: "поплавок",
  SINKER: "грузило",
  LEADER: "поводок",
  FEEDER: "фидер",
  BAIT: "наживка",
  LURE: "приманка",
  CLOTHING: "одежда",
  TENT: "палатка",
  FOOD: "еда",
  DRINK: "питьё",
  TOOL: "инструмент",
  MATERIAL: "материал",
  CONSUMABLE: "расходник",
  BOAT: "лодка",
  VEHICLE: "транспорт",
  COSMETIC: "косметика",
  RECIPE: "рецепт",
};

const SPOT_KIND: Record<string, string> = {
  hole: "яма",
  reeds: "камыш",
  snags: "коряжник",
  sand: "песок",
  bridge: "мостик",
};

function ru(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [token, setTok] = useState(localStorage.getItem("rm_admin") ?? "");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");

  async function login() {
    setError("");
    const res = await fetch("/auth/dev/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vkId: "admin", nickname: "temp" }),
    });
    if (!res.ok) {
      setError(`Вход не удался: HTTP ${res.status}`);
      return;
    }
    const body = (await res.json()) as { accessToken: string };
    localStorage.setItem("rm_admin", body.accessToken);
    setTok(body.accessToken);
  }

  function logout() {
    localStorage.removeItem("rm_admin");
    setTok("");
    setData(null);
    setError("");
  }

  useEffect(() => {
    if (!token) return;
    const path =
      tab === "overview"
        ? "/admin/overview"
        : tab === "species"
          ? "/admin/species"
          : tab === "waters"
            ? "/admin/waterbodies"
            : tab === "items"
              ? "/admin/items"
              : "/admin/players";
    void (async () => {
      setError("");
      const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setData(null);
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("rm_admin");
          setTok("");
        }
        return;
      }
      setData(await res.json());
    })();
  }, [tab, token]);

  return (
    <div className="shell">
      <header>
        <h1>Рыбацкий Мир — Admin</h1>
        <span>content</span>
      </header>
      <main>
        <section className="panel">
          <h2>Сессия</h2>
          <p className="note">
            В development кнопка «Dev-вход» выдаёт JWT с правами администратора (vkId=admin).
          </p>
          {token ? (
            <button type="button" onClick={logout}>
              Выйти
            </button>
          ) : (
            <button type="button" onClick={() => void login()}>
              Dev-вход
            </button>
          )}
          {error && <p className="note err">{error}</p>}
        </section>
        <nav className="tabs">
          {(Object.keys(LABELS) as Tab[]).map((id) => (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {LABELS[id]}
            </button>
          ))}
        </nav>
        <section className="panel">
          <h2>{tab === "waters" ? "Водоёмы и точки" : LABELS[tab]}</h2>
          <Catalog data={data} tab={tab} />
        </section>
      </main>
    </div>
  );
}

function Catalog({ data, tab }: { data: unknown; tab: Tab }) {
  if (!data) return <p className="note">нет данных</p>;
  if (tab === "overview" && data && typeof data === "object") {
    const row = data as { players: number; catches: number; species: number; items: number };
    return (
      <>
        <div className="row"><span>Игроки</span><span>{row.players}</span></div>
        <div className="row"><span>Уловы</span><span>{row.catches}</span></div>
        <div className="row"><span>Виды рыб</span><span>{row.species}</span></div>
        <div className="row"><span>Предметы</span><span>{row.items}</span></div>
      </>
    );
  }
  if (tab === "waters" && Array.isArray(data)) {
    return (
      <>
        {data.map((w: { id: string; name: string; spots?: Array<{ name: string; kind: string }> }) => (
          <div key={w.id}>
            <h3>{w.name}</h3>
            {(w.spots ?? []).map((s) => (
              <div className="row" key={s.name}>
                <span>{s.name}</span>
                <span className="note">{ru(SPOT_KIND, s.kind)}</span>
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }
  if (tab === "species" && Array.isArray(data)) {
    return (
      <>
        {data.map((s: { id: string; name: string; rarity: string; minWeightG: number; maxWeightG: number }) => (
          <div className="row" key={s.id}>
            <span>{s.name}</span>
            <span className="note">{ru(RARITY, s.rarity)} · {s.minWeightG}–{s.maxWeightG} г</span>
          </div>
        ))}
      </>
    );
  }
  if (tab === "items" && Array.isArray(data)) {
    return (
      <>
        {data.map((s: { id: string; name: string; kind: string; value: number }) => (
          <div className="row" key={s.id}>
            <span>{s.name}</span>
            <span className="note">{ru(KIND, s.kind)} · {s.value}</span>
          </div>
        ))}
      </>
    );
  }
  if (tab === "players" && Array.isArray(data)) {
    return (
      <>
        {data.map((s: { id: string; nickname: string; vkId: string; stats?: { level: number; coins: number } }) => (
          <div className="row" key={s.id}>
            <span>{s.nickname}</span>
            <span className="note">ур. {s.stats?.level ?? 0} · {s.stats?.coins ?? 0}</span>
          </div>
        ))}
      </>
    );
  }
  return <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{JSON.stringify(data, null, 2)}</pre>;
}
