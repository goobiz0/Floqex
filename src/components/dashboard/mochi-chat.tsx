"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { motion, AnimatePresence } from "motion/react";
import { ChatCircle, X, PaperPlaneRight, Robot, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function MochiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Premium spring physics for animations
  const spring = {
    type: "spring",
    damping: 25,
    stiffness: 300,
    mass: 0.8,
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={spring}
            onMouseEnter={() => setIsHoveringTrigger(true)}
            onMouseLeave={() => setIsHoveringTrigger(false)}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 group flex h-14 w-14 items-center justify-center rounded-full bg-accent text-base shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-accent/20 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <motion.div
              animate={{ rotate: isHoveringTrigger ? 10 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <ChatCircle size={26} weight="fill" className="text-white" />
            </motion.div>
            
            {/* Pulsing indicator ring */}
            <span className="absolute inset-0 -z-10 rounded-full bg-accent/40 animate-ping [animation-duration:3s]" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(5px)" }}
            transition={spring}
            className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-2xl border border-line bg-elevated/95 shadow-2xl backdrop-blur-xl ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line/50 bg-gradient-to-b from-surface/50 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover text-white shadow-sm ring-1 ring-white/10">
                  <Robot size={22} weight="duotone" />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-elevated bg-positive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-fg flex items-center gap-1.5">
                    Mochi <Sparkle size={14} weight="fill" className="text-accent" />
                  </h3>
                  <p className="text-[11px] font-medium tracking-wide text-fg-subtle">TRADING COPILOT</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent">
              {messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center h-full text-center px-4"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-line/50 shadow-sm">
                    <Robot size={32} weight="duotone" className="text-fg-subtle" />
                  </div>
                  <p className="text-sm font-medium text-fg">How can I help you trade today?</p>
                  <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                    I can analyze your risk profile, backtest ideas, or tweak your live parameters.
                  </p>
                </motion.div>
              )}

              {messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.95, originY: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex w-full",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <div className="mr-2 mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Robot size={14} weight="bold" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "relative max-w-[85%] rounded-[20px] px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm",
                        isUser
                          ? "bg-accent text-white rounded-br-[6px]"
                          : "bg-surface border border-line/50 text-fg rounded-bl-[6px]"
                      )}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex w-full justify-start items-end"
                >
                  <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Robot size={14} weight="bold" />
                  </div>
                  <div className="flex max-w-[85%] items-center gap-1.5 rounded-[20px] rounded-bl-[6px] border border-line/50 bg-surface px-4 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-fg-muted/60 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-fg-muted/60 animate-bounce [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-fg-muted/60 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} className="h-px" />
            </div>

            {/* Limits & Input Area */}
            <div className="border-t border-line/50 bg-gradient-to-t from-surface/50 to-transparent p-4 pb-5">
              {/* Energy Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle flex items-center gap-1">
                    <Sparkle size={10} weight="fill" /> Mochi Energy
                  </span>
                  <span className="text-[10px] font-medium text-accent">3/5 limit</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface shadow-inner border border-line/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full" 
                  />
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="relative flex items-end gap-2 group">
                <div className="relative w-full">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim()) handleSubmit(e as any);
                      }
                    }}
                    placeholder="Ask Mochi..."
                    rows={1}
                    className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] text-fg placeholder:text-fg-faint shadow-sm transition-all focus-visible:border-accent focus-visible:bg-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/20 max-h-32"
                    style={{ minHeight: '44px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm transition-all hover:bg-accent-hover active:scale-95 disabled:opacity-50 disabled:hover:bg-accent"
                >
                  <PaperPlaneRight size={18} weight="fill" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
