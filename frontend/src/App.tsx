import { useEffect, useState } from "react";
import { fetchHealth, type HealthPayload } from "./api/health";
import { isVkMiniApp } from "./vk/mini-app";

type ConnectionState =
  | { kind: "loading" }
  | { kind: "online"; health: HealthPayload }
  | { kind: "offline"; message: string };

function pillClass(value: string): string {
  if (value === "ok") return "pill ok";
  if (value === "degraded") return "pill warn";
  return "pill err";
}

function FishMark() {
  return (
    <svg className="mark" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="34" fill="#0b3b4c" stroke="#e0b25a" strokeWidth="2" />
      <path
        d="M18 38c8-12 22-16 32-10 4 2 8 2 12 0-3 5-3 11 0 16-4-2-8-2-12 0-10 6-24 2-32-10z"
        fill="#7ec8c4"
      />
      <circle cx="44" cy="34" r="2.2" fill="#041521" />
    </svg>
  );
}

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: "loading" });
  const vk = isVkMiniApp();

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
    <div className="scene">
      <main className="card">
        <FishMark />
        <p className="kicker">VK Mini App</p>
        <h1>Рыбацкий Мир</h1>
        <p className="subtitle">Онлайн-симулятор рыбалки</p>
        <p className="slogan">Лови. Исследуй. Соревнуйся.</p>

        <section className="status" aria-live="polite">
          <h2>Связь с backend</h2>
          {connection.kind === "loading" && (
            <div className="row">
              <span>Проверяем</span>
              <span className="pill warn">ожидание</span>
            </div>
          )}
          {connection.kind === "offline" && (
            <>
              <div className="row">
                <span>Backend</span>
                <span className="pill err">нет связи</span>
              </div>
              <p className="hint">{connection.message}</p>
            </>
          )}
          {connection.kind === "online" && (
            <>
              <div className="row">
                <span>Статус</span>
                <span className={pillClass(connection.health.status)}>
                  {connection.health.status}
                </span>
              </div>
              <div className="row">
                <span>Backend</span>
                <span className={pillClass(connection.health.backend)}>
                  {connection.health.backend}
                </span>
              </div>
              <div className="row">
                <span>PostgreSQL</span>
                <span className={pillClass(connection.health.database)}>
                  {connection.health.database}
                </span>
              </div>
              <div className="row">
                <span>Redis</span>
                <span className={pillClass(connection.health.redis)}>
                  {connection.health.redis}
                </span>
              </div>
            </>
          )}
        </section>
        <p className="hint">
          {vk
            ? "Запуск внутри VK обнаружен. Авторизация VK будет подключена после настройки приложения."
            : "Каркас клиента готов. Игровые механики появятся на следующих этапах."}
        </p>
      </main>
      <div className="reeds" />
    </div>
  );
}
