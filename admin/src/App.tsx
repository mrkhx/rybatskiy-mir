import { useEffect, useState } from "react";

type Tab = "overview" | "species" | "waters" | "items" | "players";

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [token, setTok] = useState(localStorage.getItem("rm_admin") ?? "");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");

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
          <p className="note">Нужен JWT игрока с isAdmin=true. Dev-токен с frontend не достаточно, пока пользователь не помечен админом в БД.</p>
          <input
            value={token}
            onChange={(e) => {
              setTok(e.target.value);
              localStorage.setItem("rm_admin", e.target.value);
            }}
            placeholder="Bearer JWT"
            style={{ width: "100%", minHeight: 40, marginTop: 8 }}
          />
        </section>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 20px" }}>
          {(["overview", "species", "waters", "items", "players"] as Tab[]).map((id) => (
            <button key={id} type="button" onClick={() => setTab(id)}>
              {id}
            </button>
          ))}
        </nav>
        {error && <p className="note">{error}</p>}
        <section className="panel">
          <h2>{tab}</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{data ? JSON.stringify(data, null, 2) : "нет данных"}</pre>
        </section>
      </main>
    </div>
  );
}
