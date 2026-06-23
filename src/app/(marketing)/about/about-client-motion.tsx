"use client";

import { motion, useReducedMotion } from "motion/react";
import { Children, ReactNode, isValidElement } from "react";

export function AboutClientMotion({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.15,
          },
        },
      }}
    >
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              {child}
            </motion.div>
          );
        }
        return child;
      })}
    </motion.div>
  );
}
