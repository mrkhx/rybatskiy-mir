import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Pose } from "../anim/types";

export type AnglerHandle = { apply: (pose: Pose) => void };

const C = "/scene/forest-lake/char";

export const AnglerRig = forwardRef<AnglerHandle>(function AnglerRig(_, ref) {
  const root = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    apply(p: Pose) {
      const r = root.current;
      if (!r) return;
      r.style.setProperty("--lean", p.lean.toFixed(2));
      r.style.setProperty("--breath", p.breath.toFixed(3));
      r.style.setProperty("--arm", (p.armRSh + 18).toFixed(2));
    },
  }));

  return (
    <div className="angler-rig painted" ref={root} aria-hidden="true">
      <img className="master" src={`${C}/master.webp`} alt="" draggable={false} />
      <i className="wrist" />
    </div>
  );
});
