"use client";

import { useState, useTransition } from "react";
import { HandPalm, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { emergencyStop } from "@/app/dashboard/accounts/actions";
import { useRouter } from "next/navigation";

export function EStopWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isStopped, setIsStopped] = useState(false);
  const router = useRouter();

  const handleStop = () => {
    startTransition(async () => {
      await emergencyStop();
      setIsStopped(true);
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => setIsStopped(false), 300);
      }, 2000);
    });
  };

  return (
    <div className="relative flex items-center">
      <button 
        type="button"
        title="Emergency Stop" 
        onClick={() => setIsOpen(!isOpen)}
        className="hidden sm:flex items-center justify-center h-8 w-8 text-negative bg-negative/5 hover:bg-negative/15 rounded-full transition-all group border border-negative/10 hover:border-negative/30"
      >
        <HandPalm size={14} weight="fill" className="group-active:scale-90 transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-[280px] rounded-[var(--radius-card)] border border-line bg-elevated shadow-xl shadow-black/5 p-4 z-50 animate-in fade-in slide-in-from-top-2">
          {isStopped ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <CheckCircle size={32} weight="fill" className="text-negative mb-2" />
              <p className="text-sm font-semibold text-fg">BOT STOPPED</p>
              <p className="text-xs text-fg-subtle mt-1">All algorithms halted.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-negative/10 flex items-center justify-center shrink-0">
                  <WarningCircle size={20} className="text-negative" weight="fill" />
                </div>
                <div className="pt-0.5 text-left">
                  <h4 className="text-sm font-semibold text-fg">Emergency Stop</h4>
                  <p className="text-[13px] text-fg-subtle mt-1 leading-relaxed">Halt all automated trading immediately?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="flex-1 rounded-[var(--radius-control)] border border-line bg-surface py-2 text-xs font-semibold text-fg-subtle hover:text-fg hover:bg-surface-hover disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleStop}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-negative py-2 text-xs font-semibold text-white hover:bg-negative-hover disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : "Halt Bot"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
