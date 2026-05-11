import { useState } from "react";
import { AlertCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorBlockProps {
  title: string;
  message: string;
  stackTrace?: string;
  defaultExpanded?: boolean;
}

export function ErrorBlock({ title, message, stackTrace, defaultExpanded = false }: ErrorBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-lg border-2 border-[var(--beam-destructive)]/50 bg-[var(--beam-destructive)]/5 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--beam-destructive)]/10 transition-colors"
      >
        <AlertCircle size={16} className="text-[var(--beam-destructive)] flex-shrink-0" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-[var(--beam-destructive)]">{title}</div>
          <div className="text-xs text-[var(--beam-zinc-400)] mt-1">{message}</div>
        </div>
        {stackTrace && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[var(--beam-destructive)]"
          >
            <ChevronRight size={16} />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && stackTrace && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-[var(--beam-destructive)]/30 bg-[var(--beam-black)]">
              <div className="text-xs text-[var(--beam-zinc-500)] mb-2">Stack Trace</div>
              <pre className="text-xs font-mono text-[var(--beam-zinc-400)] overflow-x-auto custom-scrollbar whitespace-pre-wrap">
                {stackTrace}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
