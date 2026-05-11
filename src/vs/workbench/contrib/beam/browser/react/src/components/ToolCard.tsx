import { useState } from "react";
import { ChevronDown, ChevronRight, FileEdit, Terminal, Search, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ToolType = "write" | "terminal" | "search" | "read";

interface ToolCardProps {
  type: ToolType;
  title: string;
  content: string;
  defaultExpanded?: boolean;
}

const toolConfig = {
  write: {
    icon: FileEdit,
    color: "var(--beam-tool-write)",
    label: "Write",
  },
  terminal: {
    icon: Terminal,
    color: "var(--beam-tool-terminal)",
    label: "Terminal",
  },
  search: {
    icon: Search,
    color: "var(--beam-tool-search)",
    label: "Search",
  },
  read: {
    icon: FileText,
    color: "var(--beam-tool-read)",
    label: "Read",
  },
};

export function ToolCard({ type, title, content, defaultExpanded = false }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = toolConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-lg border border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-900)] overflow-hidden"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: config.color,
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--beam-zinc-800)] transition-colors"
      >
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{
            backgroundColor: `${config.color}20`,
          }}
        >
          <Icon size={16} style={{ color: config.color }} />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-sm text-[var(--beam-zinc-300)]">{title}</span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[var(--beam-zinc-500)]"
        >
          <ChevronRight size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-950)]">
              <pre className="text-sm font-mono text-[var(--beam-zinc-400)] overflow-x-auto custom-scrollbar">
                {content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
