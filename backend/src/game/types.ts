export const FISHING_STATES = [
  "IDLE",
  "READY",
  "CAST",
  "WAITING_BITE",
  "BITE",
  "HOOKED",
  "FIGHTING",
  "LANDED",
  "LOST",
  "BROKEN",
] as const;

export type FishingState = (typeof FISHING_STATES)[number];

export const FISH_TIERS = ["COMMON", "LARGE", "TROPHY", "RECORD", "LEGENDARY"] as const;
export type FishTier = (typeof FISH_TIERS)[number];

export type TimeOfDay = "DAWN" | "MORNING" | "DAY" | "EVENING" | "DUSK" | "NIGHT";
export type Season = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";
export type WeatherKind =
  | "CLEAR"
  | "PARTLY_CLOUDY"
  | "OVERCAST"
  | "RAIN"
  | "DOWNPOUR"
  | "STORM"
  | "FOG"
  | "WIND"
  | "CALM"
  | "SNOW";

export type FightProfile = {
  pull: number;
  directionChange: number;
  coverSeek: number;
  stamina: number;
};

export type ActivityWindow = {
  seasons: Season[];
  times: TimeOfDay[];
  weather: WeatherKind[];
  depthMinM: number;
  depthMaxM: number;
  tempMinC: number;
  tempMaxC: number;
};

export type BiteContext = {
  method: string;
  bait?: string;
  lure?: string;
  retrieve?: string;
  depthM: number;
  season: Season;
  timeOfDay: TimeOfDay;
  weather: WeatherKind;
  temperatureC: number;
  pressureHpa: number;
  windKmh: number;
  waterClarity: number;
  eventMultiplier: number;
  skillBonus: number;
  baitQuality: number;
};

export type SpeciesForBite = {
  id: string;
  slug: string;
  spotWeight: number;
  baits: string[];
  lures: string[];
  methods: string[];
  activity: ActivityWindow;
  legendary: boolean;
};

export type Specimen = {
  speciesId: string;
  weightG: number;
  lengthCm: number;
  tier: FishTier;
};

export type FightTick = {
  reel: number;
  rodPressure: number;
  rodDir: number;
  drag: number;
};

export type FightSnapshot = {
  tension: number;
  fishStamina: number;
  lineIntegrity: number;
  progress: number;
  surge: number;
};

export type LoseReason =
  | "line_broke"
  | "hook_bent"
  | "weak_hookset"
  | "slack_line"
  | "went_to_cover"
  | "over_tension"
  | "missed_bite"
  | "released";
