import { useEffect, useRef, useState } from "react";
import { checkPrefersReducedMotion } from "../../lib/motionUtils";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Animates a numeric value from its previous value to the new value.
 * Uses requestAnimationFrame with ease-out curve.
 * Displays in JetBrains Mono by default.
 */
function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString("en-IN"),
  duration = 800,
  className = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (checkPrefersReducedMotion()) {
      prevValue.current = value;
      rafId.current = requestAnimationFrame(() => setDisplayValue(value));
      return () => cancelAnimationFrame(rafId.current);
    }

    const start = prevValue.current;
    const diff = value - start;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + diff * eased);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = value;
      }
    }

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [value, duration]);

  return (
    <span className={`sp-font-mono ${className}`}>
      {format(displayValue)}
    </span>
  );
}

export default AnimatedNumber;
