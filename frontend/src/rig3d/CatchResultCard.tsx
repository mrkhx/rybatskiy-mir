"use client";

import {
  formatCatchWeight,
  KEEP_CONFIRM,
  RELEASE_CONFIRM,
  type CatchChoice,
  type CatchResultData,
} from "./catchResult";

type Props = {
  data: CatchResultData;
  choice: CatchChoice | null;
  onKeep: () => void;
  onRelease: () => void;
  busy?: boolean;
};

export function CatchResultCard({ data, choice, onKeep, onRelease, busy = false }: Props) {
  const locked = choice !== null || busy;
  return (
    <aside
      className={`catch-result${choice === "RELEASE_SELECTED" || choice === "KEEP_SELECTED" ? " is-leaving" : ""}`}
      aria-live="polite"
      aria-label="Результат улова"
    >
      <p className="catch-result-kicker">Улов</p>
      <h2 className="catch-result-name">{data.fishName}</h2>
      <p className="catch-result-weight">{formatCatchWeight(data.weightKg)}</p>
      <p className="catch-result-rarity">{data.rarity}</p>
      {data.isRecord && <p className="catch-result-record">Новый рекорд!</p>}
      <p className="catch-result-confirm" data-choice={choice ?? ""}>
        {choice === "KEEP_SELECTED" ? KEEP_CONFIRM : choice === "RELEASE_SELECTED" ? RELEASE_CONFIRM : "\u00a0"}
      </p>
      <div className="catch-result-actions">
        <button
          type="button"
          className={choice === "KEEP_SELECTED" ? "is-picked" : ""}
          disabled={locked}
          onClick={onKeep}
        >
          Оставить
        </button>
        <button
          type="button"
          className={choice === "RELEASE_SELECTED" ? "is-picked" : ""}
          disabled={locked}
          onClick={onRelease}
        >
          Отпустить
        </button>
      </div>
    </aside>
  );
}
