"use client";

import { useEffect, useRef, Children, isValidElement, ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

export function AboutClientMotion({ children, className }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = containerRef.current;

    if (!el) return;

    if (reduce) {
      gsap.set(el.children, { opacity: 1, y: 0 });
      return;
    }

    // Initial state for children
    gsap.set(el.children, { opacity: 0, y: 30 });

    const ctx = gsap.context(() => {
      gsap.to(el.children, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: "power4.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
          once: true,
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return <div>{child}</div>;
        }
        return child;
      })}
    </div>
  );
}
