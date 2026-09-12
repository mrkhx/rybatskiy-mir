import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Pose } from "../anim/types";

type Ripple = { x: number; y: number; r: number; a: number; max: number };
export type LiveHandle = { draw: (pose: Pose, t: number, dt: number, wx: string) => void };

export const LiveCanvas = forwardRef<LiveHandle>(function LiveCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const lastSplash = useRef(0);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const fit = () => {
      const r = cvs.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.max(1, Math.floor(r.width * dpr));
      cvs.height = Math.max(1, Math.floor(r.height * dpr));
      try {
        cvs.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      } catch {
        /* jsdom */
      }
    };
    fit();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    ro?.observe(cvs);
    return () => ro?.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    draw(p, t, dt, wx) {
      const cvs = canvasRef.current;
      if (!cvs) return;
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = cvs.getContext("2d");
      } catch {
        return;
      }
      if (!ctx) return;
      const r = cvs.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      ctx.clearRect(0, 0, w, h);
      const X = (n: number) => (n / 100) * w;
      const Y = (n: number) => (n / 100) * h;
      const rain = wx === "RAIN" || wx === "DOWNPOUR" || wx === "STORM";

      const spawn = (x: number, y: number, max: number, a = 0.45) => {
        if (ripples.current.length > 22) ripples.current.shift();
        ripples.current.push({ x, y, r: 2, a, max });
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, h * 0.45, w, h * 0.55);
      ctx.clip();

      ctx.strokeStyle = "rgba(220,240,244,0.16)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const y0 = h * (0.5 + i * 0.08);
        for (let x = -20; x <= w + 20; x += 16) {
          const y = y0 + Math.sin(x * 0.02 + t * (0.8 + i * 0.15) + i) * (3 + i);
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (rain && Math.random() < (wx === "STORM" ? 0.28 : 0.14)) {
        spawn(8 + Math.random() * 84, 52 + Math.random() * 28, 18 + Math.random() * 16, 0.28);
      }
      if (p.rings > 0.2 && Math.random() < 0.07) spawn(p.floatX, p.floatY + 0.4, 22, 0.4);
      if (p.splash > lastSplash.current && p.splash > 0.3) {
        spawn(p.floatVisible ? p.floatX : p.lureX, p.floatVisible ? p.floatY : p.lureY, 34, 0.7);
      }
      lastSplash.current = p.splash;

      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const rp = ripples.current[i];
        rp.r += dt * 22;
        rp.a -= dt * 0.55;
        if (rp.a <= 0 || rp.r > rp.max) {
          ripples.current.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.ellipse(X(rp.x), Y(rp.y), rp.r, rp.r * 0.38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(230,246,248,${rp.a})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      if (p.fishVis > 0.05) {
        ctx.globalAlpha = p.fishVis * 0.55;
        ctx.fillStyle = "rgba(8, 28, 32, 0.85)";
        ctx.beginPath();
        ctx.ellipse(X(p.fishX), Y(p.fishY + 1.2), 18 + p.fishVis * 10, 6 + p.fishVis * 3, Math.sin(t * 4) * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (p.splash > 0.05) {
        ctx.globalAlpha = p.splash;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        const sx = X(p.floatVisible ? p.floatX : p.lureX);
        const sy = Y(p.floatVisible ? p.floatY : p.lureY);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(sx + Math.cos(a) * 10 * p.splash, sy + Math.sin(a) * 6 * p.splash, 2.2, 4, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      const endX = p.lureFlying ? p.lureX : p.floatVisible ? p.floatX : p.fishVis > 0.2 ? p.fishX : p.tipX + 4;
      const endY = p.lureFlying ? p.lureY : p.floatVisible ? p.floatY : p.fishVis > 0.2 ? p.fishY : p.tipY + 8;
      const sag = p.lineSag * 10;
      ctx.beginPath();
      ctx.moveTo(X(p.tipX), Y(p.tipY));
      if (p.lineBroken) ctx.lineTo(X(p.tipX + 4), Y(p.tipY + 8));
      else ctx.quadraticCurveTo(X((p.tipX + endX) / 2), Y((p.tipY + endY) / 2) + sag, X(endX), Y(endY));
      ctx.strokeStyle = p.lineBroken ? "rgba(220,210,190,0.25)" : "rgba(236,228,214,0.82)";
      ctx.lineWidth = p.lineSag < 0.12 ? 1.6 : 1.15;
      ctx.stroke();

      const mx = (p.gripX + p.tipX) / 2;
      const my = (p.gripY + p.tipY) / 2 + p.rodBend * 2.4;
      ctx.beginPath();
      ctx.moveTo(X(p.gripX), Y(p.gripY));
      ctx.quadraticCurveTo(X(mx), Y(my + 0.6), X(p.tipX), Y(p.tipY));
      ctx.strokeStyle = "#2a1c10";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(p.gripX), Y(p.gripY));
      ctx.quadraticCurveTo(X(mx), Y(my), X(p.tipX), Y(p.tipY));
      ctx.strokeStyle = "#c4a06a";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(p.gripX + 0.15), Y(p.gripY - 0.15));
      ctx.quadraticCurveTo(X(mx), Y(my - 0.3), X(p.tipX - 0.1), Y(p.tipY - 0.15));
      ctx.strokeStyle = "#ead9b4";
      ctx.lineWidth = 0.7;
      ctx.stroke();

      if (p.lureFlying) {
        ctx.fillStyle = "#c45c4a";
        ctx.beginPath();
        ctx.ellipse(X(p.lureX), Y(p.lureY), 3.2, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p.floatVisible) {
        const fx = X(p.floatX);
        const fy = Y(p.floatY + p.floatSub * 1.1);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate((p.floatTilt * Math.PI) / 180);
        ctx.fillStyle = "rgba(180,220,230,0.28)";
        ctx.beginPath();
        ctx.ellipse(0, 10, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c45c4a";
        ctx.fillRect(-4.5, -14 + p.floatSub * 8, 9, 22);
        ctx.fillStyle = "#f2eee6";
        ctx.fillRect(-3.2, -20 + p.floatSub * 8, 6.4, 8);
        ctx.restore();
      }
    },
  }));

  return <canvas ref={canvasRef} className="live-canvas" />;
});
