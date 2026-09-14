"use client";

import { formatCatchWeight, type CatchResultData } from "./catchResult";

type Props = {
  data: CatchResultData;
};

export function CatchResultCard({ data }: Props) {
  return (
    <aside className="catch-result" aria-live="polite" aria-label="Результат улова">
      <p className="catch-result-kicker">Улов</p>
      <h2 className="catch-result-name">{data.fishName}</h2>
      <p className="catch-result-weight">{formatCatchWeight(data.weightKg)}</p>
      <p className="catch-result-rarity">{data.rarity}</p>
      {data.isRecord && <p className="catch-result-record">Новый рекорд!</p>}
    </aside>
  );
}
