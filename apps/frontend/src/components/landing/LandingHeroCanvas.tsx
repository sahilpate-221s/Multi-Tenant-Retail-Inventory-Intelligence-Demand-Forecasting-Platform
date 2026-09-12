import { useRef, useEffect } from "react";
import { checkPrefersReducedMotion } from "../../lib/motionUtils";

/**
 * Atmospheric architectural canvas for the landing hero.
 * Renders a clean, spatial warehouse perspective grid with subtle amber depth
 * and gentle ambient luminescence. No sci-fi scan lines or tacky cyber text.
 */
export default function LandingHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    const setSize = () => {
      if (!canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setSize();
    window.addEventListener("resize", setSize);

    const isReduced = checkPrefersReducedMotion();

    // ── Structural Rack Cells (Subtle Architectural Representation) ──
    const RACK_ROWS = 4;
    const RACK_COLS = 6;
    interface RackCell {
      row: number;
      col: number;
      fill: number; // 0-1
      active: boolean;
    }
    const cells: RackCell[] = [];
    for (let r = 0; r < RACK_ROWS; r++) {
      for (let c = 0; c < RACK_COLS; c++) {
        const seed = Math.sin(r * 9.2 + c * 4.7) * 0.5 + 0.5;
        cells.push({
          row: r,
          col: c,
          fill: seed * 0.7 + 0.2,
          active: seed > 0.4,
        });
      }
    }

    // ── Ambient Light Dust (Subtle Depth) ──
    interface AmbientParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseAlpha: number;
      phase: number;
    }
    const particles: AmbientParticle[] = [];
    const PARTICLE_COUNT = 32;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * (width || 1200),
        y: Math.random() * (height || 800),
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.2,
        size: Math.random() * 1.5 + 0.8,
        baseAlpha: Math.random() * 0.25 + 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let frameCount = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      frameCount++;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.035;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.035;

      const mX = mouseRef.current.x;
      const mY = mouseRef.current.y;
      const t = frameCount * 0.015;

      // ── Perspective Floor Grid ──
      const horizonY = height * 0.38;
      const vanishingX = width * 0.5 + mX * 25;

      ctx.save();
      ctx.strokeStyle = "rgba(45, 45, 52, 0.4)";
      ctx.lineWidth = 1;

      // Perspective rays
      const rays = 18;
      for (let i = -rays; i <= rays; i++) {
        const groundX = vanishingX + i * (width / rays) * 1.2;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(groundX, height);
        ctx.stroke();
      }

      // Horizontal depth lines (logarithmic spacing)
      const depthLines = 10;
      for (let d = 1; d <= depthLines; d++) {
        const factor = Math.pow(d / depthLines, 2.2);
        const y = horizonY + factor * (height - horizonY);
        const alpha = factor * 0.35;
        ctx.strokeStyle = `rgba(50, 50, 60, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // ── Architectural Background Rack (Subtle Wireframe Structure on Right) ──
      const rackW = Math.min(width * 0.42, 480);
      const rackH = Math.min(height * 0.5, 340);
      const rackX = width - rackW - 40 + mX * -15;
      const rackY = height * 0.12 + mY * -10;

      // Outer frame
      ctx.save();
      ctx.strokeStyle = "rgba(60, 60, 72, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(rackX, rackY, rackW, rackH);

      // Subtle frame gradient backdrop
      const frameGrad = ctx.createLinearGradient(rackX, rackY, rackX + rackW, rackY + rackH);
      frameGrad.addColorStop(0, "rgba(22, 22, 28, 0.45)");
      frameGrad.addColorStop(1, "rgba(14, 14, 18, 0.25)");
      ctx.fillStyle = frameGrad;
      ctx.fillRect(rackX, rackY, rackW, rackH);

      // Shelving horizontal rails
      const rowHeight = rackH / RACK_ROWS;
      const colWidth = rackW / RACK_COLS;

      for (let r = 0; r <= RACK_ROWS; r++) {
        const y = rackY + r * rowHeight;
        ctx.strokeStyle = "rgba(75, 75, 88, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rackX, y);
        ctx.lineTo(rackX + rackW, y);
        ctx.stroke();
      }

      // Upright columns
      for (let c = 0; c <= RACK_COLS; c++) {
        const x = rackX + c * colWidth;
        ctx.strokeStyle = "rgba(75, 75, 88, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, rackY);
        ctx.lineTo(x, rackY + rackH);
        ctx.stroke();
      }

      // Render rack inventory packages with soft industrial glow
      for (const cell of cells) {
        const cx = rackX + cell.col * colWidth + 5;
        const cy = rackY + cell.row * rowHeight + 5;
        const cw = colWidth - 10;
        const ch = rowHeight - 10;

        if (cell.active) {
          const pulse = Math.sin(t * 1.2 + cell.col * 0.6 + cell.row) * 0.15 + 0.85;
          const isAmber = (cell.row + cell.col) % 3 === 0;

          // Package silhouette
          ctx.fillStyle = isAmber
            ? `rgba(212, 168, 83, ${0.12 * pulse})`
            : "rgba(45, 45, 55, 0.6)";
          ctx.fillRect(cx, cy, cw, ch);

          // Top highlight edge
          ctx.strokeStyle = isAmber
            ? `rgba(212, 168, 83, ${0.4 * pulse})`
            : "rgba(80, 80, 95, 0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + cw, cy);
          ctx.stroke();

          // Subdued capacity fill line
          const fillH = ch * cell.fill;
          ctx.fillStyle = isAmber
            ? `rgba(212, 168, 83, ${0.25 * pulse})`
            : "rgba(74, 186, 122, 0.2)";
          ctx.fillRect(cx, cy + (ch - fillH), cw, fillH);
        }
      }
      ctx.restore();

      // ── Floating Ambient Micro-Particles ──
      if (!isReduced) {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.y < 0) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          const alpha =
            p.baseAlpha *
            (0.6 + 0.4 * Math.sin(t * 1.8 + p.phase));

          ctx.fillStyle = `rgba(212, 168, 83, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Soft Atmospheric Warm Radial Light from Upper Right ──
      const warmGlow = ctx.createRadialGradient(
        width * 0.72 + mX * 20,
        height * 0.25 + mY * 15,
        10,
        width * 0.72 + mX * 20,
        height * 0.25 + mY * 15,
        width * 0.45
      );
      warmGlow.addColorStop(0, "rgba(212, 168, 83, 0.055)");
      warmGlow.addColorStop(0.5, "rgba(212, 168, 83, 0.015)");
      warmGlow.addColorStop(1, "rgba(12, 12, 14, 0)");

      ctx.fillStyle = warmGlow;
      ctx.fillRect(0, 0, width, height);

      if (!isReduced) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = ((e.clientX - rect.left) / (width || 1)) * 2 - 1;
      mouseRef.current.targetY = ((e.clientY - rect.top) / (height || 1)) * 2 - 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", setSize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
}
