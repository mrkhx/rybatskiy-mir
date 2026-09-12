import { useEffect, useState } from "react";
import { fetchHealth, type HealthPayload } from "./api/health";

type ConnectionState =
  | { kind: "loading" }
  | { kind: "online"; health: HealthPayload }
  | { kind: "offline"; message: string };

function tone(value: string): string {
  if (value === "ok") return "ok";
  if (value === "degraded") return "warn";
  return "err";
}

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const health = await fetchHealth(controller.signal);
        setConnection({ kind: "online", health });
      } catch (error) {
        if (controller.signal.aborted) return;
        setConnection({
          kind: "offline",
          message: error instanceof Error ? error.message : "Нет соединения",
        });
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="shell">
      <header>
        <h1>Рыбацкий Мир — Admin</h1>
        <span>foundation</span>
      </header>
      <main>
        <section className="panel">
          <h2>Связь с backend</h2>
          {connection.kind === "loading" && (
            <div className="row">
              <span>Проверка</span>
              <span className="pill warn">ожидание</span>
            </div>
          )}
          {connection.kind === "offline" && (
            <>
              <div className="row">
                <span>Backend</span>
                <span className="pill err">нет связи</span>
              </div>
              <p className="note">{connection.message}</p>
            </>
          )}
          {connection.kind === "online" && (
            <>
              <div className="row">
                <span>status</span>
                <span className={`pill ${tone(connection.health.status)}`}>
                  {connection.health.status}
                </span>
              </div>
              <div className="row">
                <span>backend</span>
                <span className={`pill ${tone(connection.health.backend)}`}>
                  {connection.health.backend}
                </span>
              </div>
              <div className="row">
                <span>database</span>
                <span className={`pill ${tone(connection.health.database)}`}>
                  {connection.health.database}
                </span>
              </div>
              <div className="row">
                <span>redis</span>
                <span className={`pill ${tone(connection.health.redis)}`}>
                  {connection.health.redis}
                </span>
              </div>
            </>
          )}
          <p className="note">
            Управление игроками и контентом появится позже. Сейчас это только каркас панели.
          </p>
        </section>
      </main>
    </div>
  );
}
