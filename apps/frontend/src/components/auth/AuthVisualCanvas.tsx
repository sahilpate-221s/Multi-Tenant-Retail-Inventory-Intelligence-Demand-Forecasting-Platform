import { useEffect, useRef } from "react";
import { checkPrefersReducedMotion } from "../../lib/motionUtils";

interface AuthVisualCanvasProps {
  mode: "login" | "register";
}

/**
 * High-tech animated spatial canvas for the auth flip card.
 * Renders an interactive neural inventory grid with pulsing nodes,
 * connecting telemetry lines, and cursor proximity repulsion.
 */
export function AuthVisualCanvas({ mode }: AuthVisualCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 380);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 520);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle nodes
    const nodeCount = mode === "login" ? 28 : 36;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1.5,
      baseAlpha: Math.random() * 0.4 + 0.3,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    const isReduced = checkPrefersReducedMotion();

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Dark gradient backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "rgba(20, 20, 24, 0.95)");
      bgGrad.addColorStop(1, "rgba(12, 12, 14, 0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle isometric grid lines
      ctx.strokeStyle = "rgba(212, 168, 83, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 40;
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

      // Draw radar sweep line
      if (!isReduced) {
        const sweepY = (frame * 0.8) % height;
        const sweepGrad = ctx.createLinearGradient(0, sweepY - 30, 0, sweepY + 10);
        sweepGrad.addColorStop(0, "transparent");
        sweepGrad.addColorStop(0.7, "rgba(212, 168, 83, 0.08)");
        sweepGrad.addColorStop(1, "rgba(212, 168, 83, 0.2)");
        ctx.fillStyle = sweepGrad;
        ctx.fillRect(0, sweepY - 30, width, 40);

        ctx.strokeStyle = "rgba(212, 168, 83, 0.3)";
        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(width, sweepY);
        ctx.stroke();
      }

      // Update and draw connections
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];

        if (!isReduced) {
          a.x += a.vx;
          a.y += a.vy;

          if (a.x < 0 || a.x > width) a.vx *= -1;
          if (a.y < 0 || a.y > height) a.vy *= -1;

          // Mouse proximity repulsion
          const dx = a.x - mouseRef.current.x;
          const dy = a.y - mouseRef.current.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90 && d > 0) {
            const force = (90 - d) / 90;
            a.x += (dx / d) * force * 1.5;
            a.y += (dy / d) * force * 1.5;
          }
        }

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 85) {
            const alpha = (1 - dist / 85) * 0.22;
            ctx.strokeStyle = `rgba(212, 168, 83, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Draw node
        const pulse = isReduced ? 1 : Math.sin(frame * a.pulseSpeed + a.pulseOffset) * 0.3 + 0.7;
        const currentAlpha = a.baseAlpha * pulse;

        ctx.fillStyle = `rgba(212, 168, 83, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();

        // Node glow
        ctx.fillStyle = `rgba(212, 168, 83, ${currentAlpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!isReduced) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ opacity: 0.95 }}
    />
  );
}
