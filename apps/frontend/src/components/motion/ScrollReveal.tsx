import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { checkPrefersReducedMotion } from "../../lib/motionUtils";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  direction?: "up" | "down" | "left" | "right";
}

/**
 * Reveals children with a directional slide + fade when they enter the viewport.
 * Uses IntersectionObserver. Respects prefers-reduced-motion.
 */
function ScrollReveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.15,
  direction = "up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(
    () => checkPrefersReducedMotion() || typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (checkPrefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      return;
    }

    const scrollParent = el.closest("main");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      {
        root: scrollParent || null,
        threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const transforms: Record<string, string> = {
    up: "translateY(24px)",
    down: "translateY(-24px)",
    left: "translateX(24px)",
    right: "translateX(-24px)",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : transforms[direction],
        transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;
