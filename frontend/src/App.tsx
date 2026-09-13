import { useCallback, useEffect, useState } from "react";
import { api, setToken, token, type Player, type Session } from "./api/client";
import { Lake } from "./scene/Lake";
import { isVkMiniApp } from "./vk/mini-app";
import { RigLab } from "./rig/RigLab";

type Tab = "fish" | "map" | "bag" | "shop" | "log" | "profile";
type Method = "FLOAT" | "SPINNING";
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
    spots: Array<{
      id: string;
      name: string;
      kind: string;
      secret: boolean;
      description: string;
      depthMinM: number;
      depthMaxM: number;
      methods: string[];
    }>;
    fauna: Array<{ fauna: { name: string; kind: string; rare: boolean } }>;
    npcs: Array<{ name: string; greeting: string }>;
  };
  events: Array<{ title: string; description: string }>;
  feeding?: Array<{ spotId: string; label: string }>;
};
type CatchRow = { id: string; kept: boolean; weightG: number; species: { name: string } };
type BagRow = {
  id: string;
  qty: number;
  slot: string | null;
  equipped: boolean;
  item: { id: string; name: string; kind: string; stats?: { method?: string } };
};
type PatchRow = {
  id: string;
  name: string;
  description: string;
  stock: string;
  requiredSkill: number;
  locked: boolean;
  hint: string | null;
  tools: string[];
};
type ShopRow = { name: string; offers: Array<{ id: string; price: number; item: { name: string } }> };

const RETRIEVE: Array<{ id: string; label: string }> = [
  { id: "even", label: "равномерная" },
  { id: "slow", label: "медленная" },
  { id: "fast", label: "быстрая" },
  { id: "stepped", label: "ступенчатая" },
  { id: "twitch", label: "твичинг" },
  { id: "pause", label: "с паузами" },
];

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "fish", label: "Ловля", icon: "M14.5 3.5v10.2a4.2 4.2 0 1 1-7.1-3" },
  { id: "map", label: "Карта", icon: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" },
  { id: "bag", label: "Снасти", icon: "M8 7V6a4 4 0 0 1 8 0v1M4 7h16v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zM4 12h16" },
  { id: "shop", label: "Лавка", icon: "M3 9l2-5h14l2 5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V9zM9.5 20.5V12h5v8.5" },
  { id: "log", label: "Трофеи", icon: "M8 4h8v5a4 4 0 0 1-8 0V4zM16 6h2.3a2.1 2.1 0 0 1 0 4.2H16M8 6H5.7a2.1 2.1 0 0 0 0 4.2H8M12 13v3M8.5 21h7" },
  { id: "profile", label: "Профиль", icon: "M12 8a3.15 3.15 0 1 0 0-6.3A3.15 3.15 0 0 0 12 8zM5.4 19.6c1.5-3.1 3.9-4.7 6.6-4.7s5.1 1.6 6.6 4.7" },
];

const TOD: Record<string, string> = {
  DAWN: "рассвет",
  MORNING: "утро",
  DAY: "день",
  EVENING: "вечер",
  DUSK: "сумерки",
  NIGHT: "ночь",
};
const WX: Record<string, string> = {
  CLEAR: "ясно",
  PARTLY_CLOUDY: "малооблачно",
  OVERCAST: "пасмурно",
  RAIN: "дождь",
  DOWNPOUR: "ливень",
  STORM: "гроза",
  FOG: "туман",
  WIND: "ветер",
  CALM: "штиль",
  SNOW: "снег",
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
const TIER: Record<string, string> = {
  COMMON: "обычная",
  LARGE: "крупная",
  TROPHY: "трофей",
  RECORD: "рекорд",
  LEGENDARY: "легенда",
};
const SKILL: Record<string, string> = {
  FLOAT: "Поплавок",
  SPINNING: "Спиннинг",
  HOOKING: "Подсечка",
  FIGHTING: "Вываживание",
  BAIT_HARVEST: "Наживка",
  COOKING: "Готовка",
  CAMP: "Лагерь",
  FEEDER: "Фидер",
  BOTTOM: "Донка",
};

export default function App() {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search);
    const path = window.location.pathname.replace(/\/+$/, "");
    if (q.get("rig") === "1" || path.endsWith("/dev/rig")) return <RigLab />;
  }
  return <GameApp />;
}

function GameApp() {
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
          <small className="kicker">VK Mini App</small>
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

function fishName(speciesName: Record<string, string>, id: string | null) {
  return speciesName[id ?? ""] ?? "рыба";
}

function hasSpinningRod(bag: BagRow[]) {
  return bag.some((row) => {
    if (row.item.kind !== "ROD") return false;
    if (row.item.id === "rod-spin-light") return true;
    return row.item.stats?.method === "SPINNING";
  });
}

const SPIN_HINT =
  "Спиннинг — обычная снасть. Купите «Лёгкий спиннинг» в лавке у озера, наденьте его в снастях и ловите у камыша или коряжника.";

function Play({ player, onPlayer }: { player: Player; onPlayer: (p: Player) => void }) {
  const [world, setWorld] = useState<WorldSnap | null>(null);
  const [tab, setTab] = useState<Tab>("fish");
  const [spotId, setSpotId] = useState("old-bridge");
  const [method, setMethod] = useState<Method>("FLOAT");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("Соберите снасть и забросьте.");
  const [force, setForce] = useState(0.6);
  const [depth, setDepth] = useState(1.4);
  const [bag, setBag] = useState<BagRow[]>([]);
  const [kept, setKept] = useState<CatchRow[]>([]);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [shopNote, setShopNote] = useState("");
  const [log, setLog] = useState<Array<{ summary: string }>>([]);
  const [speciesName, setSpeciesName] = useState<Record<string, string>>({});
  const [spinHint, setSpinHint] = useState(false);
  const [retrieve, setRetrieve] = useState("even");
  const [patches, setPatches] = useState<PatchRow[]>([]);
  const [harvestNote, setHarvestNote] = useState("");
  const [castNonce, setCastNonce] = useState(0);
  const [hookNonce, setHookNonce] = useState(0);
  const canSpin = hasSpinningRod(bag);

  const applySession = useCallback((s: Session, extra?: string) => {
    setSession(s);
    setSpotId(s.spotId);
    setMethod(s.method === "SPINNING" ? "SPINNING" : "FLOAT");
    if (extra) setStatus(extra);
  }, []);

  const begin = useCallback(async (nextSpot: string, nextMethod: Method, label?: string) => {
    const s = await api<Session>("/fishing/start", {
      method: "POST",
      body: JSON.stringify({ spotId: nextSpot, method: nextMethod }),
    });
    applySession(s, label ?? "Прицельтесь и забросьте.");
    return s;
  }, [applySession]);

  useEffect(() => {
    void api<WorldSnap>("/world").then(setWorld);
    void api<Array<{ id: string; name: string }>>("/world/species").then((rows) => {
      setSpeciesName(Object.fromEntries(rows.map((s) => [s.id, s.name])));
    });
    void api<BagRow[]>("/inventory").then(setBag);
    void api<Session>("/fishing/start", {
      method: "POST",
      body: JSON.stringify({ spotId: "old-bridge", method: "FLOAT" }),
    })
      .then((s) => {
        setSession(s);
        setSpotId(s.spotId);
        setMethod(s.method === "SPINNING" ? "SPINNING" : "FLOAT");
        setStatus("Прицельтесь и забросьте.");
      })
      .catch((e: Error) => setStatus(e.message));
  }, []);

  useEffect(() => {
    if (tab === "bag") {
      void api<BagRow[]>("/inventory").then(setBag);
      void api<CatchRow[]>("/catalog/catches").then((rows) => setKept(rows.filter((r) => r.kept).slice(0, 8)));
      void api<{ patches: PatchRow[] }>("/inventory/patches").then((r) => setPatches(r.patches));
    }
    if (tab === "shop") void api<ShopRow[]>("/shops").then(setShops);
    if (tab === "log") void api<Array<{ summary: string }>>("/catalog/diary").then(setLog);
  }, [tab]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (session?.state !== "WAITING_BITE") return;
      void api<Session>("/fishing/bite", { method: "POST", body: "{}" }).then((s) => {
        setSession(s);
        if (s.playerHint) setStatus(s.playerHint);
      });
    }, 900);
    return () => window.clearInterval(t);
  }, [session?.state]);

  useEffect(() => {
    if (session?.state === "BITE") {
      setStatus(`Поклёвка! ${fishName(speciesName, session.speciesId)}. Подсекайте.`);
    }
    if (session?.state === "LANDED") {
      setStatus(`Улов: ${fishName(speciesName, session.speciesId)} · ${session.weightG} г · ${TIER[session.tier ?? ""] ?? session.tier}`);
    }
    if (session?.state === "LOST" || session?.state === "BROKEN") {
      setStatus(LOSE[session.loseReason ?? ""] ?? "Сход");
    }
  }, [session?.state, session?.speciesId, session?.weightG, session?.tier, session?.loseReason, speciesName]);

  useEffect(() => {
    if (session?.state !== "HOOKED") return;
    void api<Session>("/fishing/tick", {
      method: "POST",
      body: JSON.stringify({ reel: 0.55, rodPressure: 0.5, rodDir: 0, drag: 0.4 }),
    })
      .then(setSession)
      .catch(() => {
        /* first fight tick can race; interval will retry while FIGHTING */
      });
  }, [session?.state]);

  useEffect(() => {
    if (session?.state !== "FIGHTING") return;
    let busy = false;
    const t = window.setInterval(() => {
      if (busy) return;
      busy = true;
      void api<Session>("/fishing/tick", {
        method: "POST",
        body: JSON.stringify({ reel: 0.58, rodPressure: 0.5, rodDir: 0, drag: 0.42 }),
      })
        .then(async (s) => {
          setSession(s);
          if (s.state === "LANDED") onPlayer(await api<Player>("/players/me"));
        })
        .catch(() => {
          /* session already left FIGHTING */
        })
        .finally(() => {
          busy = false;
        });
    }, 420);
    return () => window.clearInterval(t);
  }, [session?.state, onPlayer]);

  const tod = world?.clock.timeOfDay ?? "DAY";
  const wx = world?.clock.weather ?? "CLEAR";
  const fighting = session?.state === "FIGHTING";
  const hooked = session?.state === "HOOKED";
  const landed = session?.state === "LANDED" && Boolean(session.speciesId);
  const shownSpotId = session?.spotId ?? spotId;
  const shownMethod: Method = session?.method === "SPINNING" ? "SPINNING" : session?.method === "FLOAT" ? "FLOAT" : method;
  const spot = world?.waterbody.spots.find((s) => s.id === shownSpotId);

  const lineStatus = (() => {
    if (spinHint) return SPIN_HINT;
    if (!session) return status;
    if (session.state === "LANDED" && session.speciesId) {
      return `Улов: ${fishName(speciesName, session.speciesId)} · ${session.weightG} г · ${TIER[session.tier ?? ""] ?? session.tier}`;
    }
    if (session.state === "FIGHTING") return "Вываживание. Держите натяжение, подматывайте.";
    if (session.state === "HOOKED") return "Подсечка! Рыба на крючке.";
    if (session.state === "BITE") return `Поклёвка! ${fishName(speciesName, session.speciesId)}. Подсекайте.`;
    if (session.state === "WAITING_BITE") return session.playerHint ?? (shownMethod === "SPINNING" ? "Ждём поклёвку. Можно сменить глубину или проводку." : "Поплавок на воде. Можно сменить глубину и перезабросить.");
    if (session.state === "LOST" || session.state === "BROKEN") return LOSE[session.loseReason ?? ""] ?? "Сход";
    if (session.state === "READY") return "Прицельтесь и забросьте.";
    return status;
  })();

  async function cast() {
    setCastNonce((n) => n + 1);
    try {
      const s = await api<Session>("/fishing/cast", {
        method: "POST",
        body: JSON.stringify({ force, direction: 0.2, depthM: depth, retrieve }),
      });
      applySession(s, s.playerHint ?? "Ждём поклёвку…");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Ошибка заброса");
    }
  }

  async function hook() {
    setHookNonce((n) => n + 1);
    try {
      const s = await api<Session>("/fishing/hook", {
        method: "POST",
        body: JSON.stringify({ timingMs: 80 }),
      });
      applySession(s, s.state === "HOOKED" || s.state === "FIGHTING" ? "Подсечка! Держите натяжение." : undefined);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Ошибка подсечки");
    }
  }

  async function tick(partial: Partial<{ reel: number; rodPressure: number; rodDir: number; drag: number }>) {
    try {
      const s = await api<Session>("/fishing/tick", {
        method: "POST",
        body: JSON.stringify({ reel: 0.5, rodPressure: 0.5, rodDir: 0, drag: 0.4, ...partial }),
      });
      setSession(s);
      if (s.state === "LANDED") onPlayer(await api<Player>("/players/me"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      if (msg === "Нет вываживания") return;
      setStatus(msg);
    }
  }

  async function decide(keep: boolean) {
    try {
      const s = await api<Session>("/fishing/decide", { method: "POST", body: JSON.stringify({ keep }) });
      applySession(s, keep ? "В садке." : "Отпустили. Есть XP.");
      onPlayer(await api<Player>("/players/me"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Ошибка");
    }
  }

  function startMethod(nextSpot: string, nextMethod: Method, label?: string) {
    if (nextMethod === "SPINNING" && !hasSpinningRod(bag)) {
      setMethod("SPINNING");
      setSpinHint(true);
      return;
    }
    setSpinHint(false);
    void begin(nextSpot, nextMethod, label).catch((e: Error) => {
      if (e.message.includes("Удилище не подходит") || e.message.includes("Нужна приманка")) {
        setMethod("SPINNING");
        setSpinHint(true);
        return;
      }
      setStatus(e.message);
    });
  }

  const hud = (() => {
    if (!session) return null;
    if (session.state === "WAITING_BITE") {
      const isSpin = shownMethod === "SPINNING";
      return (
        <>
          <label className="muted">Глубина {depth.toFixed(1)} м</label>
          <input type="range" min={0.5} max={5.2} step={0.1} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          {isSpin && (
            <>
              <p className="muted">Проводка</p>
              <div className="chip-row">
                {RETRIEVE.map((r) => (
                  <button key={r.id} type="button" className={`chip-btn ${retrieve === r.id ? "on" : ""}`} onClick={() => setRetrieve(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <button className="btn primary" type="button" onClick={() => void cast()}>Перезабросить</button>
        </>
      );
    }
    if (session.state === "BITE") {
      return (
        <button className="btn primary" type="button" onClick={() => void hook()}>Подсечь</button>
      );
    }
    if (fighting || hooked) {
      return (
        <div className="fight">
          <button className="btn" type="button" onClick={() => void tick({ reel: 0.85 })}>Подмотка</button>
          <button className="btn" type="button" onClick={() => void tick({ drag: 0.8, reel: 0.3 })}>Фрикцион</button>
          <button className="btn" type="button" onClick={() => void tick({ rodPressure: 0.9 })}>Поднять удилище</button>
          <button className="btn" type="button" onClick={() => void tick({ rodDir: -0.6, reel: 0.4 })}>В сторону</button>
        </div>
      );
    }
    if (landed) {
      return (
        <div className="fight">
          <button className="btn primary" type="button" onClick={() => void decide(true)}>В садок</button>
          <button className="btn" type="button" onClick={() => void decide(false)}>Отпустить</button>
        </div>
      );
    }
    if (session.state === "LOST" || session.state === "BROKEN") {
      return (
        <button className="btn primary" type="button" onClick={() => startMethod(spotId, method)}>
          Ещё раз
        </button>
      );
    }
    if (session.state === "READY") {
      const mixes = bag.filter((r) => r.item.id.startsWith("groundbait"));
      return (
        <>
          <label className="muted">Сила заброса {Math.round(force * 100)}</label>
          <input type="range" min={0.2} max={1} step={0.05} value={force} onChange={(e) => setForce(Number(e.target.value))} />
          <label className="muted">Глубина {depth.toFixed(1)} м</label>
          <input type="range" min={0.5} max={5.2} step={0.1} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          {shownMethod === "SPINNING" && (
            <>
              <p className="muted">Проводка</p>
              <div className="chip-row">
                {RETRIEVE.map((r) => (
                  <button key={r.id} type="button" className={`chip-btn ${retrieve === r.id ? "on" : ""}`} onClick={() => setRetrieve(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {mixes.length > 0 && (
            <button
              className="btn"
              type="button"
              onClick={() => {
                const mix = mixes[0];
                if (!mix) return;
                void api<{ label: string; session: Session }>("/fishing/feed", {
                  method: "POST",
                  body: JSON.stringify({ mixItemId: mix.item.id }),
                })
                  .then(async (r) => {
                    applySession(r.session, r.label);
                    setBag(await api<BagRow[]>("/inventory"));
                    setWorld(await api<WorldSnap>("/world"));
                  })
                  .catch((e: Error) => setStatus(e.message));
              }}
            >
              Прикормить
            </button>
          )}
          <button className="btn primary" type="button" onClick={() => void cast()}>Заброс</button>
        </>
      );
    }
    return <p className="muted">{status}</p>;
  })();

  return (
    <div className="app">
      <Lake
        tod={tod}
        wx={wx}
        session={session}
        force={force}
        feeding={Boolean(world?.feeding?.some((f) => f.spotId === shownSpotId))}
        castNonce={castNonce}
        hookNonce={hookNonce}
      />
      <div className="ui">
        <header className="topbar">
          <div className="brand">
            <small>Рыбацкий Мир</small>
            <strong>{world?.waterbody.name ?? "Лесное озеро"}</strong>
          </div>
          <div className="meta">
            <span className="chip">{player.nickname}</span>
            <span className="chip">ур. {player.stats?.level ?? 1}</span>
            <span className="chip">{player.stats?.coins ?? 0} монет</span>
            <span className="chip wx">{TOD[tod] ?? tod}</span>
            <span className="chip wx">{WX[wx] ?? wx}</span>
          </div>
        </header>
        <div />
        <div>
          {tab === "fish" && (
            <div className="hud">
              <div className="panel hud-panel">
                <div className="hud-status">
                  <p className="muted">{spot?.name} · {shownMethod === "FLOAT" ? "Поплавок" : "Спиннинг"}</p>
                  <p className="muted">{TOD[tod] ?? tod} · {WX[wx] ?? wx} · {depth.toFixed(1)} м</p>
                </div>
                {world?.feeding?.find((f) => f.spotId === shownSpotId) && (
                  <p className="ok">{world.feeding.find((f) => f.spotId === shownSpotId)?.label}</p>
                )}
                {spinHint ? <p className="muted">{SPIN_HINT}</p> : <p>{lineStatus}</p>}
                {spinHint && (
                  <button className="btn primary" type="button" onClick={() => setTab("shop")}>Открыть лавку</button>
                )}
                {session && (fighting || hooked) && (
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
                  <button className="btn primary" type="button" onClick={() => startMethod(spotId, method)}>
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
              {spinHint && (
                <div className="hint">
                  <p className="muted">{SPIN_HINT}</p>
                  <button className="btn primary" type="button" onClick={() => setTab("shop")}>Открыть лавку</button>
                </div>
              )}
              {!spinHint && status && <p className="muted">{status}</p>}
              {world.events.map((e) => (
                <p key={e.title} className="warn">{e.title}</p>
              ))}
              {(world.feeding ?? []).map((f) => (
                <p key={f.spotId} className="ok">
                  {world.waterbody.spots.find((s) => s.id === f.spotId)?.name}: {f.label}
                </p>
              ))}
              <div className="list">
                {world.waterbody.spots.map((s) => {
                  const allowed = s.methods.includes(method);
                  return (
                    <button
                      key={s.id}
                      className={`btn ${shownSpotId === s.id ? "primary" : ""}`}
                      type="button"
                      disabled={s.secret || !allowed}
                      onClick={() => {
                        if (s.secret || !allowed) return;
                        setTab("fish");
                        startMethod(s.id, method, `${s.name}. Прицельтесь и забросьте.`);
                      }}
                    >
                      {s.name}{s.secret ? " · закрыто" : !allowed ? " · другой метод" : ""} · {s.depthMinM}–{s.depthMaxM} м
                    </button>
                  );
                })}
              </div>
              <div className="grid2" style={{ marginTop: 12 }}>
                <button
                  className={`btn ${method === "FLOAT" ? "primary" : ""}`}
                  type="button"
                  onClick={() => {
                    const next = world.waterbody.spots.find((s) => !s.secret && s.methods.includes("FLOAT") && s.id === spotId)
                      ?? world.waterbody.spots.find((s) => !s.secret && s.methods.includes("FLOAT"));
                    setMethod("FLOAT");
                    setSpinHint(false);
                    if (!next) {
                      setStatus("Нет открытой точки для поплавка");
                      return;
                    }
                    startMethod(next.id, "FLOAT", `${next.name}. Поплавок.`);
                  }}
                >
                  Поплавок
                </button>
                <button
                  className={`btn ${method === "SPINNING" ? "primary" : ""}`}
                  type="button"
                  onClick={() => {
                    const next = world.waterbody.spots.find((s) => !s.secret && s.methods.includes("SPINNING") && s.id === spotId)
                      ?? world.waterbody.spots.find((s) => !s.secret && s.methods.includes("SPINNING"));
                    setMethod("SPINNING");
                    if (!canSpin) {
                      setSpinHint(true);
                      return;
                    }
                    if (!next) {
                      setStatus("Нет открытой точки для спиннинга");
                      return;
                    }
                    startMethod(next.id, "SPINNING", `${next.name}. Спиннинг.`);
                  }}
                >
                  Спиннинг
                </button>
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
              <h2>Инвентарь / садок {player.stats?.keepnetCount ?? 0}/{player.stats?.keepnetCap ?? 8}</h2>
              {kept.length > 0 && (
                <>
                  <h3>В садке</h3>
                  {kept.map((row) => (
                    <div className="row" key={row.id}>
                      <span>{row.species.name}</span>
                      <span className="muted">{row.weightG} г</span>
                    </div>
                  ))}
                </>
              )}
              {bag.map((row) => (
                <div className="row" key={row.id}>
                  <span>{row.item.name} ×{row.qty}{row.equipped ? " · экип." : ""}</span>
                  <span className="actions">
                    {!row.equipped && ["ROD", "REEL", "LINE", "HOOK", "FLOAT", "BAIT", "LURE"].includes(row.item.kind) && (
                      <button className="btn" type="button" onClick={() => void api("/inventory/equip", { method: "POST", body: JSON.stringify({ inventoryId: row.id, slot: row.item.kind.toLowerCase() }) }).then(() => api<BagRow[]>("/inventory").then(setBag))}>
                        Надеть
                      </button>
                    )}
                    {["FOOD", "DRINK"].includes(row.item.kind) && (
                      <button className="btn" type="button" onClick={() => void api("/inventory/eat", { method: "POST", body: JSON.stringify({ inventoryId: row.id }) }).then(async () => { setBag(await api<BagRow[]>("/inventory")); onPlayer(await api<Player>("/players/me")); })}>
                        Съесть
                      </button>
                    )}
                  </span>
                </div>
              ))}
              <h2>Добыча наживки</h2>
              <p className="muted">Одно действие — реалистичный улов. Участки истощаются и восстанавливаются.</p>
              {harvestNote && <p className="ok">{harvestNote}</p>}
              {patches.map((p) => (
                <div className="row" key={p.id}>
                  <span>
                    {p.name}
                    <small className="muted"> · {p.stock}{p.locked ? ` · навык ${p.requiredSkill}` : ""}</small>
                    {p.hint && <div className="muted">{p.hint}</div>}
                  </span>
                  <button
                    className="btn"
                    type="button"
                    disabled={p.locked}
                    onClick={() => {
                      setHarvestNote("");
                      void api<{ name: string; qty: number; quality: string; stock: string }>("/inventory/harvest", {
                        method: "POST",
                        body: JSON.stringify({ patchId: p.id }),
                      })
                        .then(async (r) => {
                          setHarvestNote(`${r.name} ×${r.qty} · ${r.quality === "fresh" ? "свежая" : "обычная"} · ${r.stock}`);
                          setBag(await api<BagRow[]>("/inventory"));
                          setPatches((await api<{ patches: PatchRow[] }>("/inventory/patches")).patches);
                          onPlayer(await api<Player>("/players/me"));
                        })
                        .catch((e: Error) => setHarvestNote(e.message));
                    }}
                  >
                    Добыть
                  </button>
                </div>
              ))}
            </section>
          )}
          {tab === "shop" && (
            <section className="sheet panel">
              <h2>Лавки</h2>
              {spinHint && !canSpin && <p className="muted">{SPIN_HINT}</p>}
              {shops.map((shop) => (
                <div key={shop.name}>
                  <h3>{shop.name}</h3>
                  {shop.offers.map((o) => (
                    <div className="row" key={o.id}>
                      <span>{o.item.name}</span>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setShopNote("");
                          void api("/shops/buy", { method: "POST", body: JSON.stringify({ offerId: o.id, qty: 1 }) })
                            .then(async () => {
                              onPlayer(await api<Player>("/players/me"));
                              const nextBag = await api<BagRow[]>("/inventory");
                              setBag(nextBag);
                              setShopNote(`Куплено: ${o.item.name}`);
                              if (hasSpinningRod(nextBag)) setSpinHint(false);
                            })
                            .catch((e: Error) => setShopNote(e.message));
                        }}
                      >
                        {o.price} монет
                      </button>
                    </div>
                  ))}
                </div>
              ))}
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  setShopNote("");
                  void api<{ coins: number }>("/shops/sell-keepnet", { method: "POST", body: "{}" })
                    .then(async (r) => {
                      onPlayer(await api<Player>("/players/me"));
                      setKept([]);
                      setShopNote(`Садок сдан · +${r.coins} монет`);
                    })
                    .catch((e: Error) => setShopNote(e.message));
                }}
              >
                Сдать садок
              </button>
              {shopNote && <p className="muted">{shopNote}</p>}
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
              {(player.skills ?? []).map((s) => (
                <div className="row" key={s.skill}><span>{SKILL[s.skill] ?? s.skill}</span><span className="muted">ур. {s.level} · {s.xp} XP</span></div>
              ))}
              <button className="btn ghost" type="button" onClick={() => { setToken(null); location.reload(); }}>Выйти</button>
            </section>
          )}
          <nav className="dock">
            {TABS.map((item) => (
              <button key={item.id} className={tab === item.id ? "active" : ""} type="button" onClick={() => setTab(item.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.icon} /></svg>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
