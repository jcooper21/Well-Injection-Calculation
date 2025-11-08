import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for smooth number transitions with easing
 *
 * @param value - Target value to animate to
 * @param duration - Animation duration in milliseconds (default: 300)
 * @returns Current animated value
 *
 * Uses requestAnimationFrame for smooth 60fps animation with
 * ease-out-quad easing function for natural deceleration
 */
export const useAnimatedValue = (value: number, duration: number = 300): number => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = displayValue;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease-out quadratic: decelerate to zero velocity
      const easeOutQuad = progress * (2 - progress);
      setDisplayValue(startValue + (value - startValue) * easeOutQuad);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, displayValue]);

  return displayValue;
};
