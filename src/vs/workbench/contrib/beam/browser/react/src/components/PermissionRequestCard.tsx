import { useState } from "react";
import { ShieldAlert, ChevronDown, Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface PermissionRequestCardProps {
  type: "web" | "file" | "terminal";
  resource: string;
  origin?: string;
  onAllow?: () => void;
  onDeny?: () => void;
}

export function PermissionRequestCard({
  type,
  resource,
  origin,
  onAllow,
  onDeny,
}: PermissionRequestCardProps) {
  const [status, setStatus] = useState<"pending" | "allowed" | "denied">("pending");

  const handleAllow = () => {
    setStatus("allowed");
    onAllow?.();
  };

  const handleDeny = () => {
    setStatus("denied");
    onDeny?.();
  };

  const getTypeLabel = () => {
    switch (type) {
      case "web":
        return "Web Request";
      case "file":
        return "File Access";
      case "terminal":
        return "Terminal Command";
    }
  };

  if (status !== "pending") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="my-3 rounded-lg border border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-950)] p-4"
      >
        <div className="flex items-center gap-2 text-xs">
          {status === "allowed" ? (
            <>
              <Check size={14} className="text-[var(--beam-tool-write)]" />
              <span className="text-[var(--beam-zinc-400)]">Permission granted for {resource}</span>
            </>
          ) : (
            <>
              <X size={14} className="text-[var(--beam-destructive)]" />
              <span className="text-[var(--beam-zinc-400)]">Permission denied for {resource}</span>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="my-3 rounded-lg border-2 border-[var(--beam-accent-primary)] bg-[var(--beam-zinc-950)] overflow-hidden shadow-lg"
      style={{
        boxShadow: "0 0 0 4px var(--beam-accent-primary-glow)",
      }}
    >
      <div className="px-4 py-3 bg-[var(--beam-accent-primary)]/10 border-b border-[var(--beam-accent-primary)]/30 flex items-center gap-3">
        <ShieldAlert size={16} className="text-[var(--beam-accent-primary)]" />
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Permission Required</div>
          <div className="text-xs text-[var(--beam-zinc-400)] mt-0.5">
            Allow {getTypeLabel().toLowerCase()}?
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Resource Info */}
        <div className="bg-[var(--beam-black)] rounded-md p-3 border border-[var(--beam-zinc-800)]">
          <div className="text-xs text-[var(--beam-zinc-500)] mb-1">Resource</div>
          <code className="text-xs font-mono text-[var(--beam-zinc-300)] break-all">
            {resource}
          </code>
          {origin && (
            <div className="mt-2 pt-2 border-t border-[var(--beam-zinc-800)]">
              <div className="text-xs text-[var(--beam-zinc-500)] mb-1">Origin</div>
              <code className="text-xs font-mono text-[var(--beam-zinc-300)]">{origin}</code>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAllow}
            className="flex-1 px-4 py-2 text-xs rounded-md bg-[var(--beam-accent-primary)] hover:bg-[var(--beam-accent-primary-hover)] text-white font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Check size={12} />
            Allow Once
          </button>
          <button className="px-3 py-2 rounded-md bg-[var(--beam-zinc-800)] hover:bg-[var(--beam-zinc-700)] text-[var(--beam-zinc-300)] transition-colors">
            <ChevronDown size={14} />
          </button>
          <button
            onClick={handleDeny}
            className="px-4 py-2 text-xs rounded-md bg-[var(--beam-zinc-800)] hover:bg-[var(--beam-zinc-700)] text-[var(--beam-zinc-300)] font-medium transition-colors flex items-center gap-1.5"
          >
            <X size={12} />
            Deny
          </button>
        </div>
      </div>
    </motion.div>
  );
}
