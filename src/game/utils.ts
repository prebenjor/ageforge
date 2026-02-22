export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) {
    return abs >= 100 ? value.toFixed(0) : value.toFixed(1);
  }
  const suffixes = ["K", "M", "B", "T"];
  let current = abs;
  let idx = -1;
  while (current >= 1000 && idx < suffixes.length - 1) {
    current /= 1000;
    idx += 1;
  }
  const sign = value < 0 ? "-" : "";
  return `${sign}${current.toFixed(current >= 100 ? 0 : 1)}${suffixes[idx]}`;
}

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
