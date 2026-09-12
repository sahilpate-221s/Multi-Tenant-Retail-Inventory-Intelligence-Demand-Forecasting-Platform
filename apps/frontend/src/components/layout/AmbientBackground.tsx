import { useRef, useEffect } from "react";
import { checkPrefersReducedMotion } from "../../lib/motionUtils";

/**
 * Classy, lightweight ambient background animation for all internal pages.
 * Renders subtle floating luminous depth nodes and faint technical grid
 * lines to make every page feel dynamic and alive without distracting from data.
 */
export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const isReduced = checkPrefersReducedMotion();

    // Floating luminous ambient nodes
    interface AmbientNode {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      color: string;
      alpha: number;
      pulsePhase: number;
    }

    const nodes: AmbientNode[] = [
      {
        x: width * 0.2,
        y: height * 0.25,
        radius: 260,
        vx: 0.12,
        vy: 0.08,
        color: "212, 168, 83", // Amber
        alpha: 0.035,
        pulsePhase: 0,
      },
      {
        x: width * 0.75,
        y: height * 0.65,
        radius: 320,
        vx: -0.09,
        vy: -0.11,
        color: "184, 230, 54", // Lime
        alpha: 0.02,
        pulsePhase: Math.PI,
      },
      {
        x: width * 0.5,
        y: height * 0.85,
        radius: 280,
        vx: 0.07,
        vy: -0.06,
        color: "212, 168, 83", // Amber
        alpha: 0.025,
        pulsePhase: Math.PI * 0.5,
      },
    ];

    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      frame++;
      const t = frame * 0.01;

      // Draw faint technical grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render floating luminous ambient nodes
      for (const node of nodes) {
        if (!isReduced) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x - node.radius < 0 || node.x + node.radius > width) node.vx *= -1;
          if (node.y - node.radius < 0 || node.y + node.radius > height) node.vy *= -1;
        }

        const pulse = Math.sin(t + node.pulsePhase) * 0.2 + 0.8;
        const currentAlpha = node.alpha * pulse;

        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.radius
        );
        gradient.addColorStop(0, `rgba(${node.color}, ${currentAlpha})`);
        gradient.addColorStop(0.6, `rgba(${node.color}, ${currentAlpha * 0.3})`);
        gradient.addColorStop(1, "rgba(12, 12, 14, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      if (!isReduced) {
        animId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 select-none"
      style={{ opacity: 0.95 }}
    />
  );
}
