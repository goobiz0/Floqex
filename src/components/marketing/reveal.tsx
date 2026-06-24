"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

/**
 * Scroll-reveal: fade + rise as the element enters the viewport.
 * Uses GSAP ScrollTrigger for strict physics and scroll integration.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = elementRef.current;
    
    if (!el) return;

    if (reduce) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    // Set initial state
    gsap.set(el, { opacity: 0, y: 18 });

    // Create ScrollTrigger animation
    const ctx = gsap.context(() => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        delay,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%", // Trigger when top of element is 85% down the viewport
          toggleActions: "play none none none",
          once: true,
        },
      });
    }, el);

    return () => ctx.revert(); // Cleanup
  }, [delay]);

  return (
    <Tag ref={elementRef} className={className}>
      {children}
    </Tag>
  );
}
