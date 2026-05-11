import { useState } from "react";
import { Terminal, Play, SkipForward, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface TerminalBlockProps {
  command: string;
  result?: string;
  status?: "pending" | "running" | "success" | "skipped" | "error";
  onRun?: () => void;
  onSkip?: () => void;
}

export function TerminalBlock({ command, result, status = "pending", onRun, onSkip }: TerminalBlockProps) {
  const [localStatus, setLocalStatus] = useState(status);

  const handleRun = () => {
    setLocalStatus("running");
    onRun?.();
    setTimeout(() => setLocalStatus("success"), 1000);
  };

  const handleSkip = () => {
    setLocalStatus("skipped");
    onSkip?.();
  };

  const getStatusIcon = () => {
    switch (localStatus) {
      case "success":
        return <CheckCircle size={14} className="text-[var(--beam-tool-write)]" />;
      case "error":
        return <XCircle size={14} className="text-[var(--beam-destructive)]" />;
      case "skipped":
        return <SkipForward size={14} className="text-[var(--beam-zinc-500)]" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-lg border border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-950)] overflow-hidden"
    >
      <div className="px-4 py-2.5 bg-[var(--beam-zinc-900)] border-b border-[var(--beam-zinc-700)] flex items-center gap-3">
        <Terminal size={14} className="text-[var(--beam-tool-terminal)]" />
        <span className="text-xs font-medium text-[var(--beam-zinc-300)]">Command Execution</span>
        {getStatusIcon()}
      </div>

      <div className="p-4 space-y-3">
        {/* Command */}
        <div className="bg-[var(--beam-black)] rounded-md p-3 border border-[var(--beam-zinc-800)]">
          <div className="flex items-start gap-2">
            <span className="text-[var(--beam-tool-terminal)] text-xs font-mono">$</span>
            <code className="text-xs font-mono text-[var(--beam-zinc-300)] flex-1">{command}</code>
          </div>
        </div>

        {/* Actions */}
        {localStatus === "pending" && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--beam-accent-primary)] hover:bg-[var(--beam-accent-primary-hover)] text-white font-medium transition-colors flex items-center gap-1.5"
            >
              <Play size={12} />
              Run
            </button>
            <button
              onClick={handleSkip}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--beam-zinc-800)] hover:bg-[var(--beam-zinc-700)] text-[var(--beam-zinc-300)] font-medium transition-colors flex items-center gap-1.5"
            >
              <SkipForward size={12} />
              Skip
            </button>
          </div>
        )}

        {/* Result */}
        {result && localStatus === "success" && (
          <div className="bg-[var(--beam-black)] rounded-md p-3 border border-[var(--beam-tool-write)]/30">
            <div className="text-xs text-[var(--beam-zinc-500)] mb-2">Output</div>
            <pre className="text-xs font-mono text-[var(--beam-zinc-400)] whitespace-pre-wrap">
              {result}
            </pre>
          </div>
        )}

        {!result && localStatus === "success" && (
          <div className="bg-[var(--beam-black)] rounded-md p-3 border border-[var(--beam-tool-write)]/30">
            <div className="text-xs text-[var(--beam-zinc-500)] mb-2">Output</div>
            <pre className="text-xs font-mono text-[var(--beam-tool-write)]">Hello from Windsurf tools demo</pre>
          </div>
        )}

        {localStatus === "skipped" && (
          <div className="text-xs text-[var(--beam-zinc-500)] italic">Command skipped</div>
        )}

        {localStatus === "running" && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--beam-accent-primary)] animate-pulse" />
            <span className="text-xs text-[var(--beam-zinc-500)]">Running...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
