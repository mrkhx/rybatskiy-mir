import { useEffect, useRef, useState } from 'react';
import { ForestLakeAudio, type LakeCue } from './forestLakeAudio';

const KEY = 'rm-lake-sound';
function savedVolume() {
  try { const value = localStorage.getItem(KEY); const n = value === null ? .35 : Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : .35; } catch { return .35; }
}
export function LakeSound({ spot, tod, wx, phase, state, reelNonce }: {
  spot: string; tod: string; wx: string; phase: string; state?: string; reelNonce: number;
}) {
  const engine = useRef<ForestLakeAudio | null>(null);
  const [volume, setVolume] = useState(savedVolume);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const previous = useRef({ phase, state, reelNonce });
  useEffect(() => () => { engine.current?.close(); engine.current = null; }, []);
  useEffect(() => { engine.current?.configure(spot, tod, wx); }, [spot, tod, wx, enabled]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) void engine.current?.pause().catch(() => {});
      else if (enabled) void engine.current?.resume().catch(() => setEnabled(false));
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [enabled]);
  useEffect(() => {
    const prev = previous.current; previous.current = { phase, state, reelNonce };
    if (!enabled || document.hidden) return;
    const cues: Record<string, LakeCue> = {
      CAST_BACKSWING: 'cast', CAST: 'cast', FLOAT_LANDING: 'splash', WAITING_BITE: 'splash',
      HOOKSET: 'hook', HOOKED: 'hook', REEL: 'reel', LAND: 'land', LANDED: 'land', KEEP: 'keep', RELEASE: 'release',
    };
    // BITE is exclusively a change reported by the backend, never a local timer.
    if (state !== prev.state && state === 'BITE') engine.current?.cue('bite');
    else if (state !== prev.state && (state === 'BROKEN' || state === 'LOST')) engine.current?.cue('lost');
    else if (phase !== prev.phase && cues[phase]) engine.current?.cue(cues[phase]);
    else if (reelNonce !== prev.reelNonce) engine.current?.cue('reel');
  }, [phase, state, reelNonce, enabled]);
  async function toggle() {
    try {
      if (enabled) { await engine.current?.pause(); setEnabled(false); return; }
      if (!engine.current) engine.current = new ForestLakeAudio(volume);
      await engine.current.resume(); setEnabled(true); setFailed(false);
    } catch { setFailed(true); setEnabled(false); }
  }
  return <div className="lake-sound">
    <button type="button" className="chip" aria-pressed={enabled} onClick={() => void toggle()}>{enabled ? 'Звук: вкл.' : 'Включить звук'}</button>
    {enabled && <input aria-label="Громкость звуков озера" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => {
      const next = Number(e.target.value); setVolume(next); engine.current?.volume(next);
      try { localStorage.setItem(KEY, String(next)); } catch { /* storage may be unavailable in iframe */ }
    }} />}
    {failed && <span role="status">Звук недоступен в этом браузере</span>}
  </div>;
}
