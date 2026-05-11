import { useState } from "react";
import { ChevronRight, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThoughtBlockProps {
  duration?: string;
  content: string;
  defaultExpanded?: boolean;
}

export function ThoughtBlock({ duration = "2s", content, defaultExpanded = false }: ThoughtBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 rounded-lg border border-[var(--beam-zinc-800)] bg-[var(--beam-zinc-950)] overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--beam-zinc-900)] transition-colors"
      >
        <Brain size={14} className="text-[var(--beam-accent-purple)] flex-shrink-0" />
        <span className="text-xs text-[var(--beam-zinc-400)] flex-1 text-left">
          Thought for {duration}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[var(--beam-zinc-500)]"
        >
          <ChevronRight size={14} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-[var(--beam-zinc-800)] bg-[var(--beam-black)]">
              <pre className="text-xs font-mono text-[var(--beam-zinc-500)] whitespace-pre-wrap leading-relaxed">
                {content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
