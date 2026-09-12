export function decayPressure(pressure: number, hours: number): number {
  if (hours <= 0) return pressure;
  return pressure * Math.exp(-hours * 0.35);
}

export function addCastPressure(pressure: number): number {
  return Math.min(2.2, pressure + 0.14);
}
