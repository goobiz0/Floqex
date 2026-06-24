import { ReactNode, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export function Dropdown({ 
  trigger, 
  items,
  align = "right"
}: { 
  trigger: ReactNode; 
  items: { label: string; onClick: () => void; icon?: ReactNode }[];
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            style={{ originX: align === "right" ? 1 : 0, originY: 0 }}
            className={`absolute z-40 mt-2 w-48 rounded-[var(--radius-card)] border border-line bg-elevated shadow-lg ${align === "right" ? "right-0" : "left-0"}`}
          >
            <div className="py-1">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-fg transition-colors hover:bg-surface hover:text-fg focus:bg-surface focus:outline-none"
                >
                  {item.icon && <span className="text-fg-subtle">{item.icon}</span>}
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
