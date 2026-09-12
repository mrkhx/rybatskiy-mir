import { useCallback, useEffect, useState } from "react";
import { api, setToken, token, type Player, type Session } from "./api/client";
import { isVkMiniApp } from "./vk/mini-app";

type Tab = "fish" | "map" | "bag" | "shop" | "log" | "profile";
type WorldSnap = {
  clock: {
    timeOfDay: string;
    weather: string;
    season: string;
    temperatureC: number;
    pressureHpa: number;
    minutes: number;
  };
  waterbody: {
    name: string;
    description: string;
    spots: Array<{ id: string; name: string; kind: string; secret: boolean; description: string; depthMinM: number; depthMaxM: number }>;
    fauna: Array<{ fauna: { name: string; kind: string; rare: boolean } }>;
    npcs: Array<{ name: string; greeting: string }>;
  };
  events: Array<{ title: string; description: string }>;
};

const LOSE: Record<string, string> = {
  line_broke: "Леска оборвалась",
  hook_bent: "Крючок разогнулся",
  weak_hookset: "Слабая подсечка",
  slack_line: "Слишком ослаблена леска",
  went_to_cover: "Рыба ушла в коряги",
  over_tension: "Превышено натяжение",
  missed_bite: "Поклёвка прошла мимо",
};

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);

  const refresh = useCallback(async () => {
    if (!token()) {
      setPlayer(null);
      setBooting(false);
      return;
    }
    try {
      const me = await api<Player>("/players/me");
      setPlayer(me);
    } catch {
      setToken(null);
      setPlayer(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (booting) return <div className="boot"><div className="card">Загрузка…</div></div>;
  if (!player) return <Boot onReady={refresh} error={error} setError={setError} />;
  if (!player.nicknameSet) return <Setup player={player} onReady={refresh} />;
  return <Play player={player} onPlayer={setPlayer} />;
}

function Boot({
  onReady,
  error,
  setError,
}: {
  onReady: () => Promise<void>;
  error: string;
  setError: (v: string) => void;
}) {
  const vk = isVkMiniApp();
  const [vkId, setVkId] = useState("dev-1");

  async function enter() {
    setError("");
    try {
      const session = await api<{ accessToken: string }>("/auth/dev/session", {
        method: "POST",
        body: JSON.stringify({ vkId, nickname: "temp" }),
      });
      setToken(session.accessToken);
      await onReady();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Нет связи с сервером");
    }
  }

  return (
    <div className="app">
      <Lake tod="MORNING" wx="CLEAR" />
      <div className="boot">
        <div className="card">
          <small className="muted" style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>VK Mini App</small>
          <h1>Рыбацкий Мир</h1>
          <p className="muted">Онлайн-симулятор рыбалки</p>
          <p className="slogan">Лови. Исследуй. Соревнуйся.</p>
          <div className="form">
            <label className="muted">Dev-вход (локально)</label>
            <input value={vkId} onChange={(e) => setVkId(e.target.value)} />
            <button className="btn primary" type="button" onClick={() => void enter()}>Войти на озеро</button>
            {error && <p className="error">{error}</p>}
            <p className="muted">
              {vk
                ? "Запуск внутри VK. Игровой ник выбирается отдельно от имени VK."
                : "Сервер решает улов, вес и XP. Клиент только управляет забросом и вываживанием."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Setup({ player, onReady }: { player: Player; onReady: () => Promise<void> }) {
  const [nickname, setNickname] = useState("");
  const [sex, setSex] = useState("OTHER");
  const [hair, setHair] = useState("short");
  const [error, setError] = useState("");

  async function save() {
    setError("");
    try {
      await api("/players/me/character", {
        method: "POST",
        body: JSON.stringify({ sex, hairStyle: hair, outfit: "starter" }),
      });
      await api("/players/me/nickname", { method: "POST", body: JSON.stringify({ nickname }) });
      await onReady();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  return (
    <div className="app">
      <Lake tod="DAWN" wx="FOG" />
      <div className="setup">
        <div className="card">
          <h1>Ваш рыбак</h1>
          <p className="muted">VK-имя не становится ником. Придумайте своё.</p>
          <div className="form">
            <input placeholder="Ник" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            <div className="grid2">
              <select value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="MALE">Мужской</option>
                <option value="FEMALE">Женский</option>
                <option value="OTHER">Другое</option>
              </select>
              <select value={hair} onChange={(e) => setHair(e.target.value)}>
                <option value="short">Короткие волосы</option>
                <option value="long">Длинные</option>
                <option value="cap">Под кепкой</option>
              </select>
            </div>
            <button className="btn primary" type="button" onClick={() => void save()}>На озеро</button>
            {error && <p className="error">{error}</p>}
            <p className="muted">Сейчас: {player.nickname}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Play({ player, onPlayer }: { player: Player; onPlayer: (p: Player) => void }) {
  const [world, setWorld] = useState<WorldSnap | null>(null);
  const [tab, setTab] = useState<Tab>("fish");
  const [spotId, setSpotId] = useState("old-bridge");
  const [method, setMethod] = useState<"FLOAT" | "SPINNING">("FLOAT");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("Соберите снасть и забросьте.");
  const [force, setForce] = useState(0.6);
  const [depth, setDepth] = useState(1.4);
  const [bag, setBag] = useState<Array<{ id: string; qty: number; slot: string | null; equipped: boolean; item: { name: string; kind: string } }>>([]);
  const [shops, setShops] = useState<Array<{ name: string; offers: Array<{ id: string; price: number; item: { name: string } }> }>>([]);
  const [log, setLog] = useState<Array<{ summary: string }>>([]);
  const [speciesName, setSpeciesName] = useState<Record<string, string>>({});

  useEffect(() => {
    void api<WorldSnap>("/world").then(setWorld);
    void api<Array<{ id: string; name: string }>>("/world/species").then((rows) => {
      setSpeciesName(Object.fromEntries(rows.map((s) => [s.id, s.name])));
    });
  }, []);

  useEffect(() => {
    if (tab === "bag") void api<typeof bag>("/inventory").then(setBag);
    if (tab === "shop") void api<typeof shops>("/shops").then(setShops);
    if (tab === "log") void api<typeof log>("/catalog/diary").then(setLog);
  }, [tab]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (session?.state === "WAITING_BITE") {
        void api<Session>("/fishing/bite", { method: "POST", body: "{}" }).then(setSession);
      }
    }, 900);
    return () => window.clearInterval(t);
  }, [session?.state]);

  const tod = world?.clock.timeOfDay ?? "DAY";
  const wx = world?.clock.weather ?? "CLEAR";
  const fighting = session?.state === "FIGHTING" || session?.state === "HOOKED";
  const floatOn = session && ["WAITING_BITE", "BITE", "CAST"].includes(session.state);

  async function start() {
    const s = await api<Session>("/fishing/start", {
      method: "POST",
      body: JSON.stringify({ spotId, method }),
    });
    setSession(s);
    setStatus("Прицельтесь и забросьте.");
  }

  async function cast() {
    const s = await api<Session>("/fishing/cast", {
      method: "POST",
      body: JSON.stringify({ force, direction: 0.2, depthM: depth }),
    });
    setSession(s);
    setStatus("Ждём поклёвку…");
  }

  async function hook() {
    const s = await api<Session>("/fishing/hook", {
      method: "POST",
      body: JSON.stringify({ timingMs: session?.state === "BITE" ? 80 : 1800 }),
    });
    setSession(s);
    if (s.state === "LOST" || s.state === "BROKEN") setStatus(LOSE[s.loseReason ?? ""] ?? "Сход");
    else setStatus("Подсечка! Держите натяжение.");
  }

  async function tick(partial: Partial<{ reel: number; rodPressure: number; rodDir: number; drag: number }>) {
    const s = await api<Session>("/fishing/tick", {
      method: "POST",
      body: JSON.stringify({ reel: 0.5, rodPressure: 0.5, rodDir: 0, drag: 0.4, ...partial }),
    });
    setSession(s);
    if (s.state === "LANDED") {
      setStatus(`Улов: ${speciesName[s.speciesId ?? ""] ?? "рыба"} · ${s.weightG} г · ${s.tier}`);
      onPlayer(await api<Player>("/players/me"));
    }
    if (s.loseReason) setStatus(LOSE[s.loseReason] ?? "Сход");
  }

  async function decide(keep: boolean) {
    const s = await api<Session>("/fishing/decide", { method: "POST", body: JSON.stringify({ keep }) });
    setSession(s);
    onPlayer(await api<Player>("/players/me"));
    setStatus(keep ? "В садке." : "Отпустили. Есть XP.");
  }

  const spot = world?.waterbody.spots.find((s) => s.id === spotId);

  const hud = (() => {
    if (!session) return null;
    if (session.state === "BITE") {
      return (
        <button className="btn primary" type="button" onClick={() => void hook()}>Подсечь</button>
      );
    }
    if (fighting) {
      return (
        <div className="fight">
          <button className="btn" type="button" onClick={() => void tick({ reel: 0.85 })}>Подмотка</button>
          <button className="btn" type="button" onClick={() => void tick({ drag: 0.8, reel: 0.3 })}>Фрикцион</button>
          <button className="btn" type="button" onClick={() => void tick({ rodPressure: 0.9 })}>Поднять удилище</button>
          <button className="btn" type="button" onClick={() => void tick({ rodDir: -0.6, reel: 0.4 })}>В сторону</button>
        </div>
      );
    }
    if (session.state === "LANDED") {
      return (
        <div className="fight">
          <button className="btn primary" type="button" onClick={() => void decide(true)}>Оставить</button>
          <button className="btn" type="button" onClick={() => void decide(false)}>Отпустить</button>
        </div>
      );
    }
    if (session.state === "READY" || session.state === "LOST" || session.state === "BROKEN") {
      return (
        <>
          <label className="muted">Сила заброса {Math.round(force * 100)}</label>
          <input type="range" min={0.2} max={1} step={0.05} value={force} onChange={(e) => setForce(Number(e.target.value))} />
          <label className="muted">Глубина {depth.toFixed(1)} м</label>
          <input type="range" min={0.5} max={5.2} step={0.1} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          <button className="btn primary" type="button" onClick={() => void cast()}>Заброс</button>
        </>
      );
    }
    return <p className="muted">{status}</p>;
  })();

  return (
    <div className="app">
      <Lake tod={tod} wx={wx} bite={session?.state === "BITE"} float={Boolean(floatOn)} rod={fighting ? -12 : -28} />
      <div className="ui">
        <header className="topbar">
          <div className="brand">
            <small>Рыбацкий Мир</small>
            <strong>{world?.waterbody.name ?? "Лесное озеро"}</strong>
          </div>
          <div className="meta">
            <span className="chip">{player.nickname}</span>
            <span className="chip">ур. {player.stats?.level ?? 1}</span>
            <span className="chip">{player.stats?.coins ?? 0} ¤</span>
            <span className="chip">{tod} · {wx}</span>
          </div>
        </header>
        <div />
        <div>
          {tab === "fish" && (
            <div className="hud">
              <div className="panel" style={{ padding: 14, borderRadius: 22 }}>
                <p className="muted">{spot?.name} · {method === "FLOAT" ? "Поплавок" : "Спиннинг"}</p>
                <p>{status}</p>
                {session && (fighting || session.state === "LANDED") && (
                  <>
                    <p className="muted">Натяжение</p>
                    <div className={`bar ${session.tension > 0.85 ? "err" : "warn"}`}><span style={{ ["--w" as string]: `${Math.min(100, session.tension * 80)}%` }} /></div>
                    <p className="muted">Рыба</p>
                    <div className="bar"><span style={{ ["--w" as string]: `${Math.round((1 - session.fishStamina) * 100)}%` }} /></div>
                    <p className="muted">Прогресс</p>
                    <div className="bar"><span style={{ ["--w" as string]: `${Math.round(session.fightProgress * 100)}%` }} /></div>
                  </>
                )}
                {hud}
                {!session && (
                  <button className="btn primary" type="button" onClick={() => void start().catch((e: Error) => setStatus(e.message))}>
                    Начать ловлю
                  </button>
                )}
              </div>
            </div>
          )}
          {tab === "map" && world && (
            <section className="sheet panel">
              <h2>Карта глубин</h2>
              <p className="muted">{world.waterbody.description}</p>
              {world.events.map((e) => (
                <p key={e.title} className="warn">{e.title}</p>
              ))}
              <div className="list">
                {world.waterbody.spots.map((s) => (
                  <button key={s.id} className="btn" type="button" onClick={() => { setSpotId(s.id); setTab("fish"); }}>
                    {s.name}{s.secret ? " · секрет" : ""} · {s.depthMinM}–{s.depthMaxM} м
                  </button>
                ))}
              </div>
              <div className="grid2" style={{ marginTop: 12 }}>
                <button className={`btn ${method === "FLOAT" ? "primary" : ""}`} type="button" onClick={() => setMethod("FLOAT")}>Поплавок</button>
                <button className={`btn ${method === "SPINNING" ? "primary" : ""}`} type="button" onClick={() => setMethod("SPINNING")}>Спиннинг</button>
              </div>
              <h2>Живая природа</h2>
              {world.waterbody.fauna.map((f) => (
                <div className="row" key={f.fauna.name}><span>{f.fauna.name}</span><span className="muted">{f.fauna.kind}</span></div>
              ))}
              {world.waterbody.npcs.map((n) => (
                <p key={n.name} className="muted">{n.name}: {n.greeting}</p>
              ))}
            </section>
          )}
          {tab === "bag" && (
            <section className="sheet panel">
              <h2>Инвентарь / садок {player.stats?.keepnetCount}/{8}</h2>
              {bag.map((row) => (
                <div className="row" key={row.id}>
                  <span>{row.item.name} ×{row.qty}{row.equipped ? " · экип." : ""}</span>
                  {!row.equipped && ["ROD", "REEL", "LINE", "HOOK", "FLOAT", "BAIT", "LURE"].includes(row.item.kind) && (
                    <button className="btn" type="button" onClick={() => void api("/inventory/equip", { method: "POST", body: JSON.stringify({ inventoryId: row.id, slot: row.item.kind.toLowerCase() }) }).then(() => api<typeof bag>("/inventory").then(setBag))}>
                      Надеть
                    </button>
                  )}
                </div>
              ))}
              <button className="btn" type="button" onClick={() => void api("/inventory/harvest", { method: "POST", body: JSON.stringify({ kind: "worm" }) }).then(() => api<typeof bag>("/inventory").then(setBag))}>Копать червей</button>
            </section>
          )}
          {tab === "shop" && (
            <section className="sheet panel">
              <h2>Лавки</h2>
              {shops.flatMap((s) => s.offers.map((o) => (
                <div className="row" key={o.id}>
                  <span>{o.item.name}</span>
                  <button className="btn" type="button" onClick={() => void api("/shops/buy", { method: "POST", body: JSON.stringify({ offerId: o.id, qty: 1 }) }).then(async () => onPlayer(await api<Player>("/players/me")))}>{o.price} ¤</button>
                </div>
              )))}
              <button className="btn primary" type="button" onClick={() => void api("/shops/sell-keepnet", { method: "POST", body: "{}" }).then(async () => onPlayer(await api<Player>("/players/me")))}>Сдать садок</button>
            </section>
          )}
          {tab === "log" && (
            <section className="sheet panel">
              <h2>Дневник и трофеи</h2>
              {log.length === 0 && <p className="muted">Значимые уловы появятся сами.</p>}
              {log.map((e, i) => <div className="row" key={i}><span>{e.summary}</span></div>)}
            </section>
          )}
          {tab === "profile" && (
            <section className="sheet panel">
              <h2>{player.nickname}</h2>
              <div className="row"><span>Уровень</span><span>{player.stats?.level} · {player.stats?.xp} XP</span></div>
              <div className="row"><span>Титул</span><span>{player.stats?.title}</span></div>
              <div className="row"><span>Голод / жажда</span><span>{player.stats?.hunger} / {player.stats?.thirst}</span></div>
              <div className="row"><span>Premium</span><span>{player.stats?.premiumUntil ? "активен" : "нет (не P2W)"}</span></div>
              <button className="btn ghost" type="button" onClick={() => { setToken(null); location.reload(); }}>Выйти</button>
            </section>
          )}
          <nav className="dock">
            {(["fish", "map", "bag", "shop", "log", "profile"] as Tab[]).map((id) => (
              <button key={id} className={tab === id ? "active" : ""} type="button" onClick={() => setTab(id)}>
                {{ fish: "Ловля", map: "Карта", bag: "Снасти", shop: "Лавка", log: "Трофеи", profile: "Профиль" }[id]}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function Lake({ tod, wx, bite, float, rod }: { tod: string; wx: string; bite?: boolean; float?: boolean; rod?: number }) {
  return (
    <div className="lake" data-tod={tod} data-wx={wx} style={{ ["--rod-angle" as string]: `${rod ?? -28}deg` }}>
      <div className="layer far-pines" />
      <div className="layer mid-shore" />
      <div className="layer water-sheet" />
      <div className="layer reeds-left" />
      <div className="layer reeds-right" />
      <div className="layer birds" />
      <div className="layer pier" />
      <div className="layer angler" />
      <div className="layer rod" />
      <div className={`layer float ${float ? "on" : ""} ${bite ? "bite" : ""}`} />
      <div className="weather-rain" />
      <div className="weather-snow" />
    </div>
  );
}
