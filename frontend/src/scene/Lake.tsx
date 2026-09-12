type LakeProps = {
  tod: string;
  wx: string;
  bite?: boolean;
  float?: boolean;
  rod?: number;
  feeding?: boolean;
};

const RIPPLE = [12, 28, 44, 61, 73, 19, 36, 55, 81, 8];

export function Lake({ tod, wx, bite, float, rod, feeding }: LakeProps) {
  return (
    <div
      className="lake"
      data-tod={tod}
      data-wx={wx}
      data-float={float ? "1" : "0"}
      data-bite={bite ? "1" : "0"}
      data-feed={feeding ? "1" : "0"}
      style={{ ["--rod-angle" as string]: `${rod ?? -28}deg` }}
    >
      <svg className="scene" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sky-top)" />
            <stop offset="55%" stopColor="var(--sky-mid)" />
            <stop offset="100%" stopColor="var(--sky-horizon)" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water-hi)" />
            <stop offset="38%" stopColor="var(--water)" />
            <stop offset="100%" stopColor="var(--deep)" />
          </linearGradient>
          <linearGradient id="shore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d5a3a" />
            <stop offset="45%" stopColor="#2a4330" />
            <stop offset="100%" stopColor="#1a2c22" />
          </linearGradient>
          <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a6240" />
            <stop offset="50%" stopColor="#6a4630" />
            <stop offset="100%" stopColor="#3e2818" />
          </linearGradient>
          <linearGradient id="wood-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4a301c" />
            <stop offset="100%" stopColor="#2c1a10" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="78%" cy="18%" r="22%">
            <stop offset="0%" stopColor="var(--sun)" stopOpacity="0.85" />
            <stop offset="42%" stopColor="var(--sun)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--sun)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fogBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d7e6ea" stopOpacity="0" />
            <stop offset="40%" stopColor="#d7e6ea" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#d7e6ea" stopOpacity="0" />
          </linearGradient>
          <filter id="soft" x="-8%" y="-8%" width="116%" height="116%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <filter id="soft" x="-8%" y="-8%" width="116%" height="116%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <symbol id="pine" viewBox="0 0 60 110">
            <path fill="currentColor" d="M30 2 L48 34 H38 L54 58 H40 L58 88 H2 L20 58 H6 L22 34 H12 Z" />
            <rect x="26" y="86" width="8" height="22" fill="#2a1c12" />
          </symbol>
          <symbol id="reed" viewBox="0 0 18 90">
            <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M9 90 C 8 60, 11 40, 7 18" />
            <ellipse cx="7" cy="14" rx="3.2" ry="8" fill="currentColor" />
          </symbol>
          <symbol id="lily" viewBox="0 0 40 22">
            <ellipse cx="20" cy="12" rx="18" ry="8" fill="#2f5d3a" />
            <ellipse cx="20" cy="11" rx="12" ry="5" fill="#3d7348" />
            <path d="M20 12 L38 10" stroke="#1e3d26" strokeWidth="1" />
          </symbol>
        </defs>

        <rect width="1440" height="900" fill="url(#sky)" />
        <circle className="sun" cx="1120" cy="150" r="38" fill="var(--sun)" />
        <rect width="1440" height="900" fill="url(#sunGlow)" />

        <g className="clouds drift-slow">
          <ellipse cx="220" cy="110" rx="90" ry="22" fill="var(--cloud)" />
          <ellipse cx="280" cy="104" rx="60" ry="18" fill="var(--cloud)" />
          <ellipse cx="760" cy="86" rx="110" ry="20" fill="var(--cloud)" />
          <ellipse cx="820" cy="80" rx="70" ry="16" fill="var(--cloud)" />
        </g>

        <g className="far-hills">
          <path fill="var(--hill-far)" d="M0 400 C 180 360, 340 380, 520 350 C 720 318, 900 368, 1120 338 C 1280 318, 1380 350, 1440 332 L 1440 478 L 0 478 Z" />
        </g>

        <g className="far-forest drift-far">
          <path fill="#10281c" d="M0 478 L0 392 L16 318 L32 378 L46 292 L68 370 L86 270 L108 362 L128 300 L150 374 L172 262 L198 366 L220 308 L246 378 L268 250 L298 368 L328 278 L356 376 L382 242 L416 366 L448 288 L478 378 L508 258 L542 370 L572 282 L604 376 L636 248 L676 368 L708 280 L746 378 L778 246 L818 366 L852 286 L888 378 L918 258 L956 368 L988 282 L1026 376 L1058 252 L1098 370 L1130 280 L1168 378 L1198 248 L1236 368 L1270 284 L1306 376 L1338 262 L1376 368 L1408 292 L1440 370 L1440 478 Z" />
          <path fill="#163424" d="M0 478 L0 418 L22 348 L48 408 L70 330 L98 400 L124 342 L156 410 L184 322 L220 404 L252 350 L286 412 L318 328 L358 406 L392 346 L428 414 L460 334 L500 408 L536 350 L572 416 L606 338 L648 410 L684 352 L722 416 L756 332 L798 408 L836 348 L874 414 L910 336 L952 410 L988 350 L1028 416 L1062 334 L1104 410 L1140 348 L1180 416 L1214 336 L1256 410 L1292 352 L1330 414 L1364 338 L1404 408 L1440 360 L1440 478 Z" />
        </g>

        <g className="mid-forest drift-mid" fill="#1c3d2a">
          <use href="#pine" x="-30" y="300" width="150" height="210" />
          <use href="#pine" x="70" y="318" width="128" height="190" />
          <use href="#pine" x="1188" y="308" width="158" height="220" />
          <use href="#pine" x="1310" y="326" width="140" height="196" />
        </g>

        <g className="water-group">
          <path className="water-body" fill="url(#water)" d="M-20 502 C 220 488, 520 516, 820 500 S 1200 486, 1480 508 L 1480 920 L -20 920 Z" />
          <path className="tree-reflect" d="M-20 508 C 220 498, 520 522, 820 508 S 1200 496, 1480 514 L 1480 548 L -20 548 Z" />
          <g className="waves">
            <path className="wave wave-a" d="M-80 528 Q 80 516 240 530 T 560 526 T 880 534 T 1200 522 T 1520 532" fill="none" />
            <path className="wave wave-b" d="M-80 558 Q 100 544 260 560 T 580 552 T 900 564 T 1220 548 T 1540 562" fill="none" />
            <path className="wave wave-c" d="M-80 606 Q 90 592 250 608 T 570 600 T 890 612 T 1210 594 T 1530 610" fill="none" />
            <path className="wave wave-d" d="M-80 670 Q 110 656 270 672 T 590 664 T 910 676 T 1230 658 T 1550 674" fill="none" />
          </g>
        </g>

        <g className="shore">
          <path fill="url(#shore)" d="M-30 456 C 200 448, 420 470, 700 458 S 1100 444, 1480 460 L 1480 512 C 1100 528, 700 508, -30 522 Z" />
          <path className="wet-edge" d="M-30 500 C 220 490, 560 514, 900 500 S 1280 492, 1480 506" fill="none" />
        </g>

        <g className="bushes" fill="#244a32">
          <ellipse cx="90" cy="500" rx="70" ry="28" />
          <ellipse cx="150" cy="492" rx="50" ry="22" />
          <ellipse cx="1280" cy="486" rx="80" ry="30" />
          <ellipse cx="1360" cy="498" rx="54" ry="22" />
        </g>
        <g className="grass" stroke="#2d5538" strokeWidth="1.4" fill="none">
          <path d="M210 505 q 2 -22 -4 -36" />
          <path d="M218 506 q 6 -20 2 -34" />
          <path d="M226 504 q -1 -24 5 -38" />
          <path d="M420 498 q 3 -18 -2 -30" />
          <path d="M428 499 q 5 -16 1 -28" />
          <path d="M1108 492 q 2 -20 -3 -32" />
          <path d="M1118 493 q 6 -18 2 -30" />
        </g>

        <g className="snag">
          <path d="M1080 520 C 1110 500, 1160 508, 1195 470" fill="none" stroke="#3a2618" strokeWidth="7" strokeLinecap="round" />
          <path d="M1148 492 L 1172 458" stroke="#4a3220" strokeWidth="3.5" />
          <path d="M1168 478 L 1190 488" stroke="#4a3220" strokeWidth="3" />
        </g>

        <g className="lilies-g">
          <use href="#lily" x="180" y="610" width="54" height="28" />
          <use href="#lily" x="240" y="640" width="40" height="22" />
          <use href="#lily" x="150" y="668" width="46" height="24" />
          <use href="#lily" x="320" y="600" width="36" height="20" />
        </g>

        <g className="reeds-back" fill="#1d3c28" color="#1d3c28">
          {Array.from({ length: 14 }, (_, i) => (
            <use key={i} href="#reed" x={20 + i * 18} y={430} width="16" height="110" className={i % 2 ? "sway-b" : "sway-a"} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <use key={`r${i}`} href="#reed" x={1220 + i * 20} y={420} width="18" height="120" className={i % 2 ? "sway-a" : "sway-b"} />
          ))}
        </g>

        <g className="pier-g">
          <polygon className="pier-shadow" points="630,538 1028,538 1088,582 590,582" />
          <rect x="668" y="538" width="12" height="58" fill="#2a1a10" />
          <rect x="948" y="538" width="12" height="62" fill="#2a1a10" />
          <rect x="668" y="590" width="12" height="18" fill="#1a120c" opacity="0.45" />
          <rect x="948" y="594" width="12" height="18" fill="#1a120c" opacity="0.45" />
          <polygon fill="url(#wood)" points="640,498 1000,498 1060,546 610,546" />
          <g stroke="#3e2818" strokeWidth="2" opacity="0.55">
            <line x1="650" y1="506" x2="1012" y2="506" />
            <line x1="644" y1="516" x2="1026" y2="516" />
            <line x1="636" y1="526" x2="1040" y2="526" />
            <line x1="626" y1="536" x2="1052" y2="536" />
          </g>
          <polygon fill="url(#wood-side)" points="1000,498 1060,546 1060,554 1000,506" />
          <line x1="640" y1="498" x2="1000" y2="498" stroke="#c4a07a" strokeWidth="1.4" opacity="0.35" />
        </g>

        <g className="angler">
          <ellipse cx="742" cy="456" rx="9" ry="10" fill="#e4c9a6" />
          <path d="M728 450 Q 742 442 756 450" fill="none" stroke="#2c2418" strokeWidth="3.2" />
          <path d="M728 468 L 756 468 L 760 510 L 724 510 Z" fill="#3d4d38" />
          <rect x="732" y="508" width="7" height="22" fill="#2a2e28" />
          <rect x="746" y="508" width="7" height="22" fill="#2a2e28" />
          <rect x="754" y="474" width="16" height="7" rx="2" fill="#3d4d38" />
        </g>

        <g className="tackle">
          <line className="rod-stick" x1="768" y1="478" x2="900" y2="404" />
          <line className="cast-line" x1="900" y1="404" x2="980" y2="622" />
          <g className="float-bob">
            <ellipse className="float-ring" cx="982" cy="636" rx="18" ry="7" />
            <rect className="float-body" x="975" y="606" width="12" height="28" rx="5" />
            <rect className="float-tip" x="977" y="598" width="8" height="12" rx="2" />
          </g>
        </g>

        <g className="reeds-front" color="#245833">
          {Array.from({ length: 9 }, (_, i) => (
            <use key={i} href="#reed" x={40 + i * 22} y={560} width="20" height="150" className={i % 2 ? "sway-a" : "sway-b"} />
          ))}
        </g>

        <g className="birds">
          <path d="M180 150 q 10 8 20 0" fill="none" stroke="#1a1a18" strokeWidth="1.6" />
          <path d="M250 128 q 12 9 24 0" fill="none" stroke="#1a1a18" strokeWidth="1.6" />
          <path d="M320 160 q 9 7 18 0" fill="none" stroke="#1a1a18" strokeWidth="1.5" />
        </g>

        <rect className="fog" width="1440" height="900" fill="url(#fogBand)" />
        <rect className="flash" width="1440" height="900" />
      </svg>
      <div className="vignette-sheet" />

      <div className="caustic-sheet" />
      <div className="weather-rain" />
      <div className="weather-snow" />
      <div className="weather-ripples">
        {RIPPLE.map((n, i) => (
          <span key={i} className="ripple" style={{ left: `${18 + (n % 70)}%`, top: `${58 + (n % 22)}%`, animationDelay: `${i * 0.45}s` }} />
        ))}
      </div>
      {feeding && <div className="feed-ring" />}
      {bite && <div className="splash" />}
    </div>
  );
}
