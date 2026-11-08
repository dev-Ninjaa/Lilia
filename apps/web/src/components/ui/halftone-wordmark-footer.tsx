"use client";

import * as React from "react";

export interface HalftonePalette {
  background: string;
  ink: string;
  warm: string;
}

export type HalftonePreset = "aurora" | "night" | "paper" | "ember" | "cobalt";

export interface FooterLink {
  label: string;
  href?: string;
  badge?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface HalftoneWordmarkFooterProps {
  wordmark?: string;
  label?: string;
  meta?: string;
  columns?: FooterColumn[];
  backToTop?: boolean;
  preset?: HalftonePreset;
  palette?: { background?: string; ink?: string; warm?: string };
  dotGap?: number;
  radius?: number;
  crop?: number;
  grain?: number;
  interactive?: boolean;
  fontFamily?: string;
  fontWeight?: number;
  monoFamily?: string;
  height?: string;
  className?: string;
}

const PRESETS: { [K in HalftonePreset]: HalftonePalette } = {
  aurora: { background: "#07080a", ink: "#e2e8f0", warm: "#ff6b4a" },
  night: { background: "#07080a", ink: "#ffffff", warm: "#ff2f3a" },
  paper: { background: "#efebe3", ink: "#17150f", warm: "#c2361c" },
  ember: { background: "#160a06", ink: "#f2c48c", warm: "#ff5a1f" },
  cobalt: { background: "#0d1b4d", ink: "#dfe7ff", warm: "#ffcd3c" },
};

const DEFAULT_LILIA_COLUMNS: FooterColumn[] = [
  {
    title: "Protocol",
    links: [
      { label: "Consensus Firewall", href: "#firewall" },
      { label: "Simulation Lab", href: "#simulation" },
      { label: "Model Context Protocol (MCP)", href: "#mcp" },
      { label: "Ed25519 Permit Engine", href: "#problem" },
    ],
  },
  {
    title: "Security & Hook",
    links: [
      { label: "Token-2022 Transfer Hook", href: "#firewall" },
      { label: "Validator Reversion Rules", href: "#firewall" },
      { label: "Spending Velocity Caps", href: "#problem" },
      { label: "Prompt Injection Interceptor", href: "#firewall" },
    ],
  },
  {
    title: "Ecosystem",
    links: [
      { label: "Solana Devnet", href: "https://explorer.solana.com/?cluster=devnet" },
      { label: "Anchor Program Specs", href: "#architecture" },
      { label: "Claude & Cursor Integration", href: "#mcp" },
      { label: "Status: Consensus Online", href: "#simulation" },
    ],
  },
];

const SANS_STACK =
  'var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MONO_STACK = 'var(--font-geist-mono), "Geist Mono", Menlo, Monaco, Consolas, monospace';

export function hwfHex(hex: string) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const h =
    m[1].length === 3
      ? m[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : m[1];
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

export function hwfRadius(coverage: number, gap: number) {
  const c = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage;
  return Math.sqrt(c) * gap * 0.58;
}

export function hwfStep(
  x: number,
  y: number,
  vx: number,
  vy: number,
  hx: number,
  hy: number,
  px: number,
  py: number,
  r: number,
) {
  const dx = x - px;
  const dy = y - py;
  const d2 = dx * dx + dy * dy;
  let nvx = vx;
  let nvy = vy;
  if (r > 0 && d2 < r * r) {
    const d = Math.sqrt(d2) + 0.001;
    const f = (1 - d / r) * 2.8;
    nvx += (dx / d) * f;
    nvy += (dy / d) * f;
  }
  nvx = (nvx + (hx - x) * 0.05) * 0.84;
  nvy = (nvy + (hy - y) * 0.05) * 0.84;
  return [x + nvx, y + nvy, nvx, nvy];
}

export function hwfWarmth(x: number, y: number, hx: number, hy: number, span: number) {
  const d = Math.hypot(x - hx, y - hy);
  return span > 0 ? Math.min(1, d / span) : 0;
}

export function hwfFitSize(measured: number, width: number) {
  return measured > 0 ? (width / measured) * 100 : 0;
}

const HWF_CSS = `
.hwf-root {
  position: relative; width: 100%; overflow: hidden; isolation: isolate;
  background: var(--hwf-bg); color: var(--hwf-ink); -webkit-font-smoothing: antialiased;
}
.hwf-root canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; max-width: none; }
.hwf-top {
  position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.4fr) repeat(3, minmax(0, 1fr));
  gap: 32px; padding: clamp(28px, 4vw, 48px) clamp(24px, 4vw, 56px) 0;
  font-family: var(--hwf-mono); font-size: 11px; letter-spacing: .16em; text-transform: uppercase; line-height: 1.75;
}
.hwf-brand strong { display: block; font-weight: 700; color: #ffffff; letter-spacing: 0.12em; font-size: 13px; }
.hwf-brand span { opacity: .55; font-size: 11px; display: block; margin-top: 4px; text-transform: none; letter-spacing: 0.04em; max-width: 320px; line-height: 1.6; }
.hwf-col h3 { margin: 0 0 12px 0; font: inherit; opacity: .5; font-weight: 600; color: #ffb347; letter-spacing: 0.18em; }
.hwf-col ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.hwf-col a, .hwf-up {
  color: inherit; text-decoration: none; opacity: .75; background: none; border: 0; padding: 0;
  font: inherit; letter-spacing: inherit; text-transform: none; cursor: pointer;
  background-image: linear-gradient(#ff6b4a, #ff6b4a); background-size: 0% 1px;
  background-repeat: no-repeat; background-position: 0 100%; transition: opacity .25s ease, background-size .35s cubic-bezier(.2,.7,.1,1), color .2s ease;
}
.hwf-col a:hover, .hwf-up:hover { opacity: 1; color: #ffffff; background-size: 100% 1px; }
.hwf-col a:focus-visible, .hwf-up:focus-visible { outline: 1px solid #ff6b4a; outline-offset: 3px; opacity: 1; }
.hwf-rule {
  position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 16px;
  margin: clamp(24px, 3vw, 36px) clamp(24px, 4vw, 56px) 0; padding-top: 16px;
  border-top: 0.5px solid rgba(255, 255, 255, 0.1);
  font-family: var(--hwf-mono); font-size: 11px; letter-spacing: .16em; text-transform: uppercase;
}
.hwf-meta-tag {
  color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 8px;
}
.hwf-up {
  display: inline-flex; align-items: center; gap: 6px; color: #ff6b4a; font-weight: 600;
}
.hwf-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 840px) {
  .hwf-top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); row-gap: 24px; }
  .hwf-brand { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .hwf-col a, .hwf-up { transition: none; }
}
`;

export default function HalftoneWordmarkFooter({
  wordmark = "lilia",
  label = "LILIA SECURITY PROTOCOL",
  meta = "AI-assisted on-chain security protocol for autonomous agents. Mathematical spending limits enforced by Solana Token-2022 Transfer Hooks.",
  columns = DEFAULT_LILIA_COLUMNS,
  backToTop = true,
  preset = "aurora",
  palette,
  dotGap = 6,
  radius = 90,
  crop = 0.18,
  grain = 0.5,
  interactive = true,
  fontFamily = SANS_STACK,
  fontWeight = 800,
  monoFamily = MONO_STACK,
  height = "540px",
  className = "",
}: HalftoneWordmarkFooterProps) {
  const colors = { ...(PRESETS[preset] || PRESETS.aurora), ...(palette || {}) };
  const rootRef = React.useRef<HTMLElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const opts = React.useRef({
    colors,
    dotGap,
    radius,
    crop,
    grain,
    interactive,
    fontFamily,
    fontWeight,
    wordmark,
  });
  opts.current = {
    colors,
    dotGap,
    radius,
    crop,
    grain,
    interactive,
    fontFamily,
    fontWeight,
    wordmark,
  };
  const key = [
    wordmark,
    dotGap,
    crop,
    grain,
    fontFamily,
    fontWeight,
    colors.background,
    colors.ink,
    colors.warm,
  ].join("|");

  // biome-ignore lint/correctness/useExhaustiveDependencies: effect reads refs and the joined key by design
  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let px = -1e5;
    let py = -1e5;
    let raf = 0;
    let visible = true;
    let awake = true;
    let ring = { x: 0, y: 0, t: -1 };
    let dots = new Float32Array(0);
    let count = 0;
    let grainTile: HTMLCanvasElement | null = null;
    const ink = hwfHex(opts.current.colors.ink) || [255, 255, 255];
    const warm = hwfHex(opts.current.colors.warm) || [255, 107, 74];

    const layout = () => {
      const o = opts.current;
      const rect = root.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const mask = document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      const m = mask.getContext("2d", { willReadFrequently: true });
      if (!m) return;
      const face = `${o.fontWeight} 100px ${o.fontFamily}`;
      m.font = face;
      const word = o.wordmark || "lilia";
      const fit = hwfFitSize(m.measureText(word).width, w * 0.98);
      m.font = `${o.fontWeight} ${fit}px ${o.fontFamily}`;
      const box = m.measureText(word);
      const cap = box.actualBoundingBoxAscent || fit * 0.72;
      const c = Math.max(0, Math.min(0.6, o.crop));
      m.fillStyle = "#000";
      m.textBaseline = "alphabetic";
      m.fillText(word, (w - box.width) / 2, h + cap * c);
      const img = m.getImageData(0, 0, w, h).data;

      const gap = Math.max(3, o.dotGap);
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const tmp: number[] = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += img[(y * w + x) * 4 + 3];
            }
          }
          const cov = sum / (9 * 255);
          if (cov < 0.05) continue;
          const hx = gx * gap + gap / 2;
          const hy = gy * gap + gap / 2;
          tmp.push(hx, hy, 0, 0, hx, hy, hwfRadius(cov, gap));
        }
      }
      dots = new Float32Array(tmp);
      count = tmp.length / 7;

      grainTile = document.createElement("canvas");
      grainTile.width = 256;
      grainTile.height = 256;
      const g = grainTile.getContext("2d");
      if (g) {
        const id = g.createImageData(256, 256);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = Math.random() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = Math.random() < 0.5 ? 0 : 255;
        }
        g.putImageData(id, 0, 0);
      }
      awake = true;
    };

    const draw = (now: number) => {
      const o = opts.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = o.colors.background;
      ctx.fillRect(0, 0, w, h);

      // Subtle warm ambient radial glow under the canvas
      const glowGrad = ctx.createRadialGradient(w / 2, h * 0.85, 10, w / 2, h * 0.85, w * 0.45);
      glowGrad.addColorStop(0, "rgba(255, 107, 74, 0.08)");
      glowGrad.addColorStop(0.5, "rgba(255, 47, 58, 0.03)");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      const r = o.interactive && !reduced ? Math.max(0, o.radius) : 0;
      const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
      const ringR = ringAge * 0.95;
      let moving = false;
      for (let i = 0; i < count; i++) {
        const j = i * 7;
        let x = dots[j];
        let y = dots[j + 1];
        let vx = dots[j + 2];
        let vy = dots[j + 3];
        const hx = dots[j + 4];
        const hy = dots[j + 5];
        if (!reduced) {
          if (ringAge < 950) {
            const dx = hx - ring.x;
            const dy = hy - ring.y;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const band = 1 - Math.min(1, Math.abs(d - ringR) / 28);
            if (band > 0) {
              const f = band * 3.4 * (1 - ringAge / 950);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
            }
          }
          const s = hwfStep(x, y, vx, vy, hx, hy, px, py, r);
          x = s[0];
          y = s[1];
          vx = s[2];
          vy = s[3];
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05)
            moving = true;
          else {
            x = hx;
            y = hy;
            vx = 0;
            vy = 0;
          }
          dots[j] = x;
          dots[j + 1] = y;
          dots[j + 2] = vx;
          dots[j + 3] = vy;
        }
        const k = hwfWarmth(x, y, hx, hy, 32);
        ctx.fillStyle =
          k > 0.02
            ? `rgb(${Math.round(ink[0] + (warm[0] - ink[0]) * k)},${Math.round(ink[1] + (warm[1] - ink[1]) * k)},${Math.round(ink[2] + (warm[2] - ink[2]) * k)})`
            : o.colors.ink;
        ctx.beginPath();
        ctx.arc(x, y, dots[j + 6], 0, 6.2832);
        ctx.fill();
      }

      if (grainTile && o.grain > 0) {
        ctx.globalAlpha = Math.min(1, o.grain) * 0.08;
        ctx.globalCompositeOperation = "overlay";
        const pattern = ctx.createPattern(grainTile, "repeat");
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      awake = moving || ringAge < 950 || px > -1e4;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      draw(now);
      if (awake) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      awake = true;
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    const toLocal = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };
    const onMove = (e: PointerEvent) => {
      if (!opts.current.interactive) return;
      const p = toLocal(e);
      px = p[0];
      py = p[1];
      wake();
    };
    const onLeave = () => {
      px = -1e5;
      py = -1e5;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (!opts.current.interactive || reduced) return;
      if ((e.target as HTMLElement).closest("a,button")) return;
      const p = toLocal(e);
      ring = { x: p[0], y: p[1], t: performance.now() };
      wake();
    };

    layout();
    draw(performance.now());
    wake();

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    const ro = new ResizeObserver(() => {
      layout();
      wake();
    });
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      visible = entries[0] ? entries[0].isIntersecting : true;
      if (visible) wake();
    });
    io.observe(root);

    let alive = true;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!alive) return;
        layout();
        wake();
      });
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [key]);

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      ref={rootRef}
      className={`hwf-root ${className}`}
      style={
        {
          height,
          "--hwf-bg": colors.background,
          "--hwf-ink": colors.ink,
          "--hwf-mono": monoFamily,
        } as React.CSSProperties
      }
    >
      <style>{HWF_CSS}</style>
      <canvas ref={canvasRef} />
      <span className="hwf-sr">{wordmark}</span>
      <div className="hwf-top">
        <div className="hwf-brand">
          <strong>{label}</strong>
          <span>{meta}</span>
        </div>
        {columns.map((col) => (
          <nav className="hwf-col" key={col.title} aria-label={col.title}>
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href || "#"}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="hwf-rule">
        <div className="hwf-meta-tag">
          <span className="inline-block w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
          <span>Solana Devnet Token-2022 Transfer Hook • 2026</span>
        </div>
        {backToTop ? (
          <button type="button" className="hwf-up" onClick={toTop}>
            Back to top ↑
          </button>
        ) : null}
      </div>
    </footer>
  );
}
