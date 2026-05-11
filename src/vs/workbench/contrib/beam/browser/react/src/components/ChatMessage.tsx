import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content?: string;
  timestamp?: string;
  children?: React.ReactNode;
}

export function ChatMessage({ role, content, timestamp, children }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex w-full gap-3"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[var(--beam-zinc-900)] border border-[var(--beam-zinc-800)] flex items-center justify-center">
        {role === "assistant" ? (
          <Sparkles size={14} className="text-[var(--beam-accent-primary)]" />
        ) : (
          <User size={14} className="text-[var(--beam-zinc-500)]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[var(--beam-zinc-400)]">
            {role === "assistant" ? "Cascade" : "You"}
          </span>
          {timestamp && (
            <span className="text-xs text-[var(--beam-zinc-600)]">{timestamp}</span>
          )}
        </div>
        <div className="text-sm leading-relaxed text-[var(--beam-zinc-300)]">
          {children || content}
        </div>
      </div>
    </motion.div>
  );
}
