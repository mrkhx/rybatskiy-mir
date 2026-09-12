import type { InterestBreakdown } from "./interest";

const HINTS: Record<string, string> = {
  bait: "Наживка плохо подходит этой рыбе",
  lure: "Приманка здесь почти не работает",
  lureSize: "Размер приманки не совпадает с тем, что сейчас ищут",
  retrieve: "Приманка идёт слишком быстро или не той проводкой",
  depth: "На этой глубине активность низкая",
  time: "Сейчас не самое удачное время для этой рыбы",
  season: "Сезон против вас",
  weather: "Погода снижает интерес рыбы",
  temp: "Температура воды некомфортна",
  method: "Этот способ ловли здесь слабо работает",
  groundbait: "Прикормочное пятно почти не держит нужную рыбу",
  overfeed: "Перекорм: рыба сыта и реже берёт насадку",
  pressureSpot: "Точка уже продавлена — осторожная рыба отошла",
  presence: "Этой рыбы на точке почти нет",
  boilie: "Бойл не совпадает с условиями",
  wind: "Ветер мешает подаче",
  pressure: "Скачок давления притормозил клёв",
  legendary: "Легенда выходит только при редком стечении условий",
};

export function playerHint(rows: InterestBreakdown[]): string | null {
  const alive = rows.filter((r) => !r.excluded);
  if (alive.length === 0) {
    const worst = rows.slice().sort((a, b) => maxFactorPenalty(a) - maxFactorPenalty(b))[0];
    if (!worst?.weakest) return "Сейчас нет ни одного подходящего кандидата — смените точку, глубину или насадку";
    return HINTS[worst.weakest] ?? "Сейчас клёва нет — пересмотрите снасть и место";
  }
  const best = alive.slice().sort((a, b) => b.score - a.score)[0];
  if (!best) return null;
  if (best.score > 0.18) return null;
  if (!best.weakest) return "Клёв слабый — попробуйте другую подачу";
  return HINTS[best.weakest] ?? null;
}

function maxFactorPenalty(row: InterestBreakdown): number {
  return Math.min(...Object.values(row.factors));
}
