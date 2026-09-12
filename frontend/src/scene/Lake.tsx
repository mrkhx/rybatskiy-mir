import { useEffect, useRef } from "react";

type LakeProps = {
  tod: string;
  wx: string;
  bite?: boolean;
  float?: boolean;
  rod?: number;
  feeding?: boolean;
};

const RIPPLE = [12, 28, 44, 61, 73, 19, 36, 55, 81, 8, 47, 66];
const A = "/scene/forest-lake";
const V = "v=5";

export function Lake({ tod, wx, bite, float, rod, feeding }: LakeProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const set = (x: number, y: number) => {
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => set(0, 0);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={root}
      className="lake"
      data-tod={tod}
      data-wx={wx}
      data-float={float ? "1" : "0"}
      data-bite={bite ? "1" : "0"}
      data-feed={feeding ? "1" : "0"}
      style={{ ["--rod-angle" as string]: `${rod ?? -28}deg` }}
    >
      <img className="lyr sky par-far" src={`${A}/sky.webp?${V}`} alt="" />
      <div className="sun-glow par-far" />
      <img className="lyr far-forest par-far" src={`${A}/far-forest.webp?${V}`} alt="" />

      <div className="lyr water par-play">
        <img className="water-tex" src={`${A}/water.webp?${V}`} alt="" />
        <div className="water-reflect" />
        <div className="water-sheen" />
        <svg className="water-svg" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
          <path className="wave wave-a" d="M-80 48 Q 80 28 240 50 T 560 44 T 880 56 T 1200 40 T 1520 52" fill="none" />
          <path className="wave wave-b" d="M-80 96 Q 100 78 260 98 T 580 90 T 900 108 T 1220 86 T 1540 102" fill="none" />
          <path className="wave wave-c" d="M-80 168 Q 90 150 250 170 T 570 162 T 890 180 T 1210 154 T 1530 174" fill="none" />
          <path className="wave wave-d" d="M-80 248 Q 110 230 270 250 T 590 242 T 910 260 T 1230 234 T 1550 254" fill="none" />
        </svg>
      </div>

      <img className="lyr lilies-a par-play" src={`${A}/lilies.webp?${V}`} alt="" />
      <img className="lyr lilies-b" src={`${A}/lilies.webp?${V}`} alt="" />
      <img className="lyr rocks par-play" src={`${A}/rocks.webp?${V}`} alt="" />

      <div className="lyr play-rig par-play">
        <img className="pier-reflect" src={`${A}/pier.webp?${V}`} alt="" />
        <div className="pier-shadow" />
        <img className="pier" src={`${A}/pier.webp?${V}`} alt="" />
        <div className="pier-wet" />
        <div className="angler" />
      </div>

      <svg className="lyr tackle par-play" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line className="rod-under" x1="26.4" y1="47.4" x2="48.8" y2="35.2" />
        <line className="rod-stick" x1="26.4" y1="47.4" x2="48.8" y2="35.2" />
        <line className="rod-hi" x1="26.6" y1="47.1" x2="48.5" y2="35.4" />
        <line className="cast-line" x1="48.8" y1="35.2" x2="67.2" y2="57.2" />
        <g className="float-bob">
          <ellipse className="float-ring" cx="67.9" cy="58.4" rx="2.4" ry="0.95" />
          <rect className="float-body" x="67.2" y="54.0" width="1.4" height="3.8" rx="0.7" />
          <rect className="float-tip" x="67.35" y="52.9" width="1.1" height="1.4" rx="0.25" />
        </g>
      </svg>

      <img className="lyr reeds-l par-fg sway-a" src={`${A}/reeds.webp?${V}`} alt="" />
      <img className="lyr reeds-r par-fg sway-b" src={`${A}/reeds.webp?${V}`} alt="" />
      <img className="lyr branch par-fg" src={`${A}/branch.webp?${V}`} alt="" />

      <div className="wash" />
      <div className="fog-sheet" />
      <div className="vignette-sheet" />
      <div className="caustic-sheet" />
      <div className="weather-rain" />
      <div className="weather-snow" />
      <div className="weather-ripples">
        {RIPPLE.map((n, i) => (
          <span
            key={i}
            className="ripple"
            style={{ left: `${14 + (n % 74)}%`, top: `${54 + (n % 28)}%`, animationDelay: `${i * 0.38}s` }}
          />
        ))}
      </div>
      {feeding && <div className="feed-ring" />}
      {bite && <div className="splash" />}
    </div>
  );
}
