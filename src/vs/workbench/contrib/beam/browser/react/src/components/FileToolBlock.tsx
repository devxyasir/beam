import { useState } from "react";
import { FileSearch, Globe, FolderOpen, FileText, ChevronRight, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ToolType = "analyzed" | "searched_web" | "explored" | "read";

interface FileToolBlockProps {
  type: ToolType;
  path?: string;
  query?: string;
  result?: string;
  status?: "pending" | "success" | "skipped";
  defaultExpanded?: boolean;
}

const toolConfig = {
  analyzed: {
    icon: FileSearch,
    label: "Analyzed",
    color: "var(--beam-tool-read)",
  },
  searched_web: {
    icon: Globe,
    label: "Searched web",
    color: "var(--beam-accent-primary)",
  },
  explored: {
    icon: FolderOpen,
    label: "Explored file",
    color: "var(--beam-tool-terminal)",
  },
  read: {
    icon: FileText,
    label: "Read",
    color: "var(--beam-tool-write)",
  },
};

export function FileToolBlock({
  type,
  path,
  query,
  result,
  status = "success",
  defaultExpanded = false,
}: FileToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = toolConfig[type];
  const Icon = config.icon;

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle size={12} className="text-[var(--beam-tool-write)]" />;
      case "pending":
        return <Loader2 size={12} className="text-[var(--beam-zinc-500)] animate-spin" />;
      case "skipped":
        return <span className="text-xs text-[var(--beam-zinc-500)]">Skipped</span>;
      default:
        return null;
    }
  };

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
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${config.color}20`,
          }}
        >
          <Icon size={14} style={{ color: config.color }} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </span>
            {getStatusIcon()}
          </div>
          <div className="text-xs text-[var(--beam-zinc-400)] mt-0.5 truncate">
            {path || query}
          </div>
        </div>
        {result && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[var(--beam-zinc-500)] flex-shrink-0"
          >
            <ChevronRight size={14} />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-[var(--beam-zinc-800)] bg-[var(--beam-black)]">
              <pre className="text-xs font-mono text-[var(--beam-zinc-400)] whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                {result}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
