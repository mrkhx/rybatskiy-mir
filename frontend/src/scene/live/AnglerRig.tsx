import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Pose } from "../anim/types";

export type AnglerHandle = { apply: (pose: Pose) => void };

export const AnglerRig = forwardRef<AnglerHandle>(function AnglerRig(_, ref) {
  const torso = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const armR = useRef<SVGGElement>(null);
  const armL = useRef<SVGGElement>(null);
  const forearmR = useRef<SVGGElement>(null);
  const breath = useRef<SVGGElement>(null);

  useImperativeHandle(ref, () => ({
    apply(p: Pose) {
      breath.current?.setAttribute("transform", `translate(0 ${p.breath * 1.2})`);
      torso.current?.setAttribute("transform", `rotate(${p.lean} 40 88)`);
      head.current?.setAttribute("transform", `rotate(${p.head} 40 34)`);
      armR.current?.setAttribute("transform", `rotate(${p.armRSh} 55 50)`);
      forearmR.current?.setAttribute("transform", `rotate(${p.armREl} 64 64)`);
      armL.current?.setAttribute("transform", `rotate(${p.armLSh} 26 52)`);
    },
  }));

  return (
    <svg className="angler-rig" viewBox="0 0 80 130" aria-hidden="true">
      <g ref={breath}>
        <g ref={torso}>
          <ellipse cx="28" cy="116" rx="9" ry="3.4" fill="#1c1814" opacity="0.45" />
          <ellipse cx="50" cy="116" rx="9" ry="3.4" fill="#1c1814" opacity="0.45" />
          <path d="M22 84 L26 114 L36 114 L40 90" fill="#4a433c" />
          <path d="M58 84 L54 114 L44 114 L40 90" fill="#3f3934" />
          <rect x="24" y="108" width="14" height="6" rx="2" fill="#2c261e" />
          <rect x="42" y="108" width="14" height="6" rx="2" fill="#2c261e" />
          <path d="M23 50 Q40 44 57 50 L61 86 Q40 96 19 86 Z" fill="#6d7d4e" stroke="#3d4a30" strokeWidth="1.2" />
          <path d="M27 54 Q40 50 53 54 L54 72 Q40 76 26 72 Z" fill="#7e915b" />
          <g ref={armL}>
            <path d="M26 52 Q16 64 15 82" stroke="#5d6c47" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M15 82 Q14 92 18 98" stroke="#d2ae86" strokeWidth="5.6" strokeLinecap="round" fill="none" />
          </g>
          <g ref={armR}>
            <path d="M55 50 Q64 56 64 64" stroke="#5d6c47" strokeWidth="8.2" strokeLinecap="round" fill="none" />
            <g ref={forearmR}>
              <path d="M64 64 Q72 70 74 80" stroke="#6d7d4e" strokeWidth="7" strokeLinecap="round" fill="none" />
              <circle className="wrist" cx="74" cy="81" r="3.8" fill="#d2ae86" />
            </g>
          </g>
          <g ref={head}>
            <ellipse cx="40" cy="36" rx="14" ry="15" fill="#d2ae86" />
            <path d="M25 32 Q40 14 55 32 Q52 26 40 24 Q28 26 25 32" fill="#7a6540" />
            <rect x="24" y="32" width="32" height="7" rx="2" fill="#5c4a2e" />
            <ellipse cx="40" cy="26" rx="12" ry="4.5" fill="#8a734c" />
          </g>
        </g>
      </g>
    </svg>
  );
});
