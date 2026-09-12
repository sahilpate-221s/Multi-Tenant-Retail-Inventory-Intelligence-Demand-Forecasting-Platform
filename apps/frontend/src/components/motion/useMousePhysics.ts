import { useEffect, useRef, useCallback } from "react";
import { checkPrefersReducedMotion } from "../../lib/motionUtils";

interface MousePhysicsState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

/**
 * Tracks cursor position with spring physics.
 * Returns normalized coordinates (-1 to 1) with velocity.
 * Uses requestAnimationFrame for smooth interpolation.
 */
export function useMousePhysics(stiffness = 0.08, damping = 0.92) {
  const state = useRef<MousePhysicsState>({ x: 0, y: 0, velocityX: 0, velocityY: 0 });
  const target = useRef({ x: 0, y: 0 });
  const subscribers = useRef<Set<(s: MousePhysicsState) => void>>(new Set());
  const rafId = useRef<number>(0);

  const subscribe = useCallback((fn: (s: MousePhysicsState) => void) => {
    subscribers.current.add(fn);
    return () => { subscribers.current.delete(fn); };
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }

    function tick() {
      const s = state.current;
      const t = target.current;

      const dx = t.x - s.x;
      const dy = t.y - s.y;

      s.velocityX = (s.velocityX + dx * stiffness) * damping;
      s.velocityY = (s.velocityY + dy * stiffness) * damping;

      s.x += s.velocityX;
      s.y += s.velocityY;

      subscribers.current.forEach((fn) => fn({ ...s }));
      rafId.current = requestAnimationFrame(tick);
    }

    // Check for reduced motion preference
    if (!checkPrefersReducedMotion()) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      rafId.current = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [stiffness, damping]);

  const getState = useCallback(() => state.current, []);

  return { getState, subscribe };
}
