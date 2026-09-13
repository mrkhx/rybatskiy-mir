import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Pose } from "../anim/types";

export type AnglerHandle = { apply: (pose: Pose) => void };

const C = "/scene/forest-lake/char";

export const AnglerRig = forwardRef<AnglerHandle>(function AnglerRig(_, ref) {
  const root = useRef<HTMLDivElement>(null);
  const torso = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const armR = useRef<HTMLDivElement>(null);
  const forearmR = useRef<HTMLDivElement>(null);
  const armL = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    apply(p: Pose) {
      const r = root.current;
      if (r) {
        r.style.setProperty("--lean", `${p.lean}`);
        r.style.setProperty("--breath", p.breath.toFixed(3));
      }
      torso.current && (torso.current.style.transform = `rotate(${p.lean * 0.35}deg)`);
      head.current && (head.current.style.transform = `rotate(${p.head}deg)`);
      armL.current && (armL.current.style.transform = `rotate(${p.armLSh - 12}deg)`);
      armR.current && (armR.current.style.transform = `rotate(${p.armRSh + 18}deg)`);
      forearmR.current && (forearmR.current.style.transform = `rotate(${p.armREl - 22}deg)`);
    },
  }));

  return (
    <div className="angler-rig painted" ref={root} aria-hidden="true">
      <div className="part body" ref={torso}>
        <img src={`${C}/body.webp`} alt="" draggable={false} />
      </div>
      <div className="part arm-l" ref={armL}>
        <img src={`${C}/arm-l.webp`} alt="" draggable={false} />
      </div>
      <div className="part arm-r" ref={armR}>
        <img className="upper-r" src={`${C}/arm-r.webp`} alt="" draggable={false} />
        <div className="part forearm-r" ref={forearmR}>
          <i className="wrist" />
        </div>
      </div>
      <div className="part head" ref={head}>
        <img src={`${C}/head.webp`} alt="" draggable={false} />
      </div>
    </div>
  );
});
