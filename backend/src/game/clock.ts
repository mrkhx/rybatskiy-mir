import type { Season, TimeOfDay, WeatherKind } from "./types";
import { mulberry32, type Rng } from "./rng";

export type ClockState = {
  season: Season;
  dayOfYear: number;
  minutes: number;
  weather: WeatherKind;
  temperatureC: number;
  waterTempC: number;
  pressureHpa: number;
  windKmh: number;
  waterClarity: number;
  moonPhase: number;
};

const WEATHER_BY_SEASON: Record<Season, WeatherKind[]> = {
  SPRING: ["CLEAR", "PARTLY_CLOUDY", "OVERCAST", "RAIN", "WIND", "FOG"],
  SUMMER: ["CLEAR", "PARTLY_CLOUDY", "CALM", "RAIN", "STORM", "DOWNPOUR"],
  AUTUMN: ["OVERCAST", "RAIN", "WIND", "FOG", "PARTLY_CLOUDY"],
  WINTER: ["SNOW", "OVERCAST", "WIND", "FOG", "CLEAR"],
};

export function seasonFromDay(dayOfYear: number): Season {
  if (dayOfYear < 80 || dayOfYear >= 355) return "WINTER";
  if (dayOfYear < 172) return "SPRING";
  if (dayOfYear < 266) return "SUMMER";
  return "AUTUMN";
}

export function timeOfDay(minutes: number): TimeOfDay {
  if (minutes < 300) return "NIGHT";
  if (minutes < 360) return "DAWN";
  if (minutes < 600) return "MORNING";
  if (minutes < 1020) return "DAY";
  if (minutes < 1140) return "EVENING";
  if (minutes < 1260) return "DUSK";
  return "NIGHT";
}

export function advanceClock(state: ClockState, realSeconds: number): ClockState {
  const gameMinutes = Math.max(1, Math.round(realSeconds / 15));
  let minutes = state.minutes + gameMinutes;
  let dayOfYear = state.dayOfYear;
  while (minutes >= 1440) {
    minutes -= 1440;
    dayOfYear = (dayOfYear % 365) + 1;
  }
  const season = seasonFromDay(dayOfYear);
  const rng = mulberry32(dayOfYear * 1000 + Math.floor(minutes / 40));
  return applyWeather(season, dayOfYear, minutes, rng);
}

export function applyWeather(season: Season, dayOfYear: number, minutes: number, rng: Rng): ClockState {
  const pool = WEATHER_BY_SEASON[season];
  const weather = pool[Math.floor(rng.next() * pool.length)] ?? "CLEAR";
  const baseTemp = { SPRING: 10, SUMMER: 22, AUTUMN: 8, WINTER: -4 }[season];
  const tod = timeOfDay(minutes);
  const swing = tod === "NIGHT" || tod === "DAWN" ? -4 : tod === "DAY" ? 4 : 0;
  const temperatureC = round1(baseTemp + swing + (rng.next() - 0.5) * 6);
  const waterTempC = round1(temperatureC - (season === "WINTER" ? 1 : 3) + rng.next());
  const pressureHpa = round1(1000 + rng.next() * 30);
  const windKmh = round1(weather === "CALM" ? rng.next() * 3 : weather === "STORM" ? 28 + rng.next() * 18 : 4 + rng.next() * 16);
  const waterClarity = round1(
    weather === "DOWNPOUR" || weather === "STORM" ? 0.35 : weather === "RAIN" ? 0.5 : 0.65 + rng.next() * 0.3,
  );
  const moonPhase = round1(((dayOfYear % 30) + minutes / 1440) / 30);
  return {
    season,
    dayOfYear,
    minutes,
    weather,
    temperatureC,
    waterTempC,
    pressureHpa,
    windKmh,
    waterClarity,
    moonPhase,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
