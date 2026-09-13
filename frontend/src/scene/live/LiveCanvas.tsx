import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Pose } from "../anim/types";
import { sceneQuality, type Quality } from "../quality";

type Ripple = { x: number; y: number; r: number; a: number; max: number };
type Drop = { x: number; y: number; len: number; spd: number };
export type LiveHandle = { draw: (pose: Pose, t: number, dt: number, wx: string) => void };

export const LiveCanvas = forwardRef<LiveHandle>(function LiveCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const drops = useRef<Drop[]>([]);
  const lastSplash = useRef(0);
  const floatImg = useRef<HTMLImageElement | null>(null);
  const quality = useRef<Quality>("HIGH");
  const flash = useRef(0);

  useEffect(() => {
    quality.current = sceneQuality();
    const img = new Image();
    img.src = "/scene/forest-lake/float.webp?v=12";
    img.onload = () => {
      floatImg.current = img;
    };
    const cvs = canvasRef.current;
    if (!cvs) return;
    const fit = () => {
      const r = cvs.getBoundingClientRect();
      const dpr = Math.min(quality.current === "LOW" ? 1 : 2, window.devicePixelRatio || 1);
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
      const q = quality.current;
      const storm = wx === "STORM";

      const spawn = (x: number, y: number, max: number, a = 0.45) => {
        const cap = q === "LOW" ? 8 : q === "MEDIUM" ? 14 : 22;
        if (ripples.current.length > cap) ripples.current.shift();
        ripples.current.push({ x, y, r: 2, a, max });
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, h * 0.48, w, h * 0.52);
      ctx.clip();

      const waves = q === "LOW" ? 2 : 5;
      for (let i = 0; i < waves; i++) {
        ctx.beginPath();
        const y0 = h * (0.48 + i * 0.07);
        const amp = (4 + i * 1.4) * (storm ? 1.35 : 1);
        ctx.strokeStyle = `rgba(210,224,226,${0.1 - i * 0.014})`;
        ctx.lineWidth = 0.85;
        for (let x = -24; x <= w + 24; x += 14) {
          const y = y0
            + Math.sin(x * 0.018 + t * (0.7 + i * 0.13) + i) * amp
            + Math.sin(x * 0.041 + t * 1.1) * amp * 0.28;
          if (x === -24) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (rain && q !== "LOW") {
        const chance = storm ? 0.32 : wx === "DOWNPOUR" ? 0.22 : 0.12;
        if (Math.random() < chance) spawn(8 + Math.random() * 84, 52 + Math.random() * 28, 16 + Math.random() * 14, 0.26);
      }
      if (p.rings > 0.2 && Math.random() < 0.08) spawn(p.floatX, p.floatY + 0.4, 22, 0.42);
      if (p.splash > lastSplash.current && p.splash > 0.3) {
        spawn(p.floatVisible ? p.floatX : p.lureX, p.floatVisible ? p.floatY : p.lureY, 36, 0.72);
      }
      lastSplash.current = p.splash;

      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const rp = ripples.current[i];
        if (!rp) continue;
        rp.r += dt * 24;
        rp.a -= dt * 0.55;
        if (rp.a <= 0 || rp.r > rp.max) {
          ripples.current.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.ellipse(X(rp.x), Y(rp.y), rp.r, rp.r * 0.36, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(230,246,248,${rp.a})`;
        ctx.lineWidth = 1.35;
        ctx.stroke();
      }

      if (p.fishVis > 0.05) {
        ctx.globalAlpha = p.fishVis * 0.58;
        ctx.fillStyle = "rgba(6, 24, 28, 0.9)";
        ctx.beginPath();
        ctx.ellipse(X(p.fishX), Y(p.fishY + 1.2), 20 + p.fishVis * 12, 6.5 + p.fishVis * 3, Math.sin(t * 4) * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (p.splash > 0.05) {
        ctx.globalAlpha = p.splash;
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        const sx = X(p.floatVisible ? p.floatX : p.lureX);
        const sy = Y(p.floatVisible ? p.floatY : p.lureY);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(sx + Math.cos(a) * 11 * p.splash, sy + Math.sin(a) * 6 * p.splash, 2.1, 4.2, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      if (rain && q !== "LOW") {
        const n = storm ? 70 : wx === "DOWNPOUR" ? 48 : 28;
        if (drops.current.length < n) {
          for (let i = drops.current.length; i < n; i++) {
            drops.current.push({
              x: Math.random() * w,
              y: Math.random() * h * 0.72,
              len: 8 + Math.random() * 10,
              spd: 380 + Math.random() * 220,
            });
          }
        }
        ctx.strokeStyle = "rgba(226,236,242,0.38)";
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        for (const d of drops.current) {
          d.y += d.spd * dt;
          d.x += dt * 48;
          if (d.y > h * 0.78) {
            d.y = -12;
            d.x = Math.random() * w;
          }
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + 3, d.y + d.len);
        }
        ctx.stroke();
      } else {
        drops.current.length = 0;
      }

      if (storm) {
        if (flash.current <= 0 && Math.random() < 0.004) flash.current = 1;
        if (flash.current > 0) {
          ctx.fillStyle = `rgba(210,228,240,${0.16 * flash.current})`;
          ctx.fillRect(0, 0, w, h * 0.55);
          flash.current -= dt * 2.8;
        }
      }

      const showLine = p.lureFlying || p.floatVisible || p.fishVis > 0.2;
      if (showLine) {
        const endX = p.lureFlying ? p.lureX : p.floatVisible ? p.floatX : p.fishVis > 0.2 ? p.fishX : p.tipX + 4;
        const endY = p.lureFlying ? p.lureY : p.floatVisible ? p.floatY : p.fishVis > 0.2 ? p.fishY : p.tipY + 8;
        const sag = p.lineSag * 10;
        ctx.beginPath();
        ctx.moveTo(X(p.tipX), Y(p.tipY));
        if (p.lineBroken) ctx.lineTo(X(p.tipX + 4), Y(p.tipY + 8));
        else ctx.quadraticCurveTo(X((p.tipX + endX) / 2), Y((p.tipY + endY) / 2) + sag, X(endX), Y(endY));
        ctx.strokeStyle = p.lineBroken ? "rgba(180,176,168,0.2)" : "rgba(196, 202, 196, 0.38)";
        ctx.lineWidth = p.lineSag < 0.12 ? 1.05 : 0.75;
        ctx.stroke();
      }

      const mx = (p.gripX + p.tipX) / 2;
      const my = (p.gripY + p.tipY) / 2 + p.rodBend * 2.6;
      ctx.beginPath();
      ctx.moveTo(X(p.gripX), Y(p.gripY));
      ctx.quadraticCurveTo(X(mx), Y(my + 0.6), X(p.tipX), Y(p.tipY));
      ctx.strokeStyle = "#2c281e";
      ctx.lineWidth = 1.65;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(p.gripX), Y(p.gripY));
      ctx.quadraticCurveTo(X(mx), Y(my), X(p.tipX), Y(p.tipY));
      ctx.strokeStyle = "#7a6b4e";
      ctx.lineWidth = 0.95;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(p.gripX + 0.12), Y(p.gripY - 0.12));
      ctx.quadraticCurveTo(X(mx), Y(my - 0.25), X(p.tipX - 0.08), Y(p.tipY - 0.12));
      ctx.strokeStyle = "rgba(198, 186, 158, 0.7)";
      ctx.lineWidth = 0.4;
      ctx.stroke();

      if (p.lureFlying) {
        ctx.fillStyle = "#c45c4a";
        ctx.beginPath();
        ctx.ellipse(X(p.lureX), Y(p.lureY), 3.2, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p.floatVisible) {
        const fx = X(p.floatX);
        const fy = Y(p.floatY);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate((p.floatTilt * Math.PI) / 180);
        ctx.fillStyle = "rgba(16, 36, 40, 0.28)";
        ctx.beginPath();
        ctx.ellipse(0, 1.2, 7, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(210, 230, 234, 0.22)";
        ctx.beginPath();
        ctx.ellipse(0, 0.4, 6.2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        const dip = p.floatSub * 4;
        const fi = floatImg.current;
        if (fi && fi.complete && fi.naturalHeight > 0) {
          ctx.drawImage(fi, -2.6, -13 + dip, 5.2, 18);
        } else {
          ctx.fillStyle = "#8a4a40";
          ctx.fillRect(-1.6, -9 + dip, 3.2, 11);
          ctx.fillStyle = "#e6e0d4";
          ctx.fillRect(-1.1, -13 + dip, 2.2, 4);
        }
        ctx.restore();
      }
    },
  }));

  return <canvas ref={canvasRef} className="live-canvas" />;
});
