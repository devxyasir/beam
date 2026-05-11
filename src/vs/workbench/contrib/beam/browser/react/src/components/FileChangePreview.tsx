import { useState } from "react";
import { FileEdit, FilePlus, Check, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FileChange {
  id: string;
  filename: string;
  status: "new" | "modified" | "deleted";
  additions?: number;
  deletions?: number;
  diff?: string;
}

interface FileChangePreviewProps {
  files: FileChange[];
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

export function FileChangePreview({ files, onAcceptAll, onRejectAll }: FileChangePreviewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [acceptedFiles, setAcceptedFiles] = useState<Set<string>>(new Set());
  const [rejectedFiles, setRejectedFiles] = useState<Set<string>>(new Set());

  const toggleFile = (id: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const acceptFile = (id: string) => {
    setAcceptedFiles((prev) => new Set(prev).add(id));
    setRejectedFiles((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rejectFile = (id: string) => {
    setRejectedFiles((prev) => new Set(prev).add(id));
    setAcceptedFiles((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "var(--beam-tool-write)";
      case "modified":
        return "var(--beam-accent-primary)";
      case "deleted":
        return "var(--beam-destructive)";
      default:
        return "var(--beam-zinc-500)";
    }
  };

  const getStatusLabel = (status: string, additions?: number, deletions?: number) => {
    if (status === "new") return "new";
    if (additions || deletions) {
      return `+${additions || 0} -${deletions || 0}`;
    }
    return status;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-lg border border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-950)] overflow-hidden"
    >
      <div className="px-4 py-3 bg-[var(--beam-zinc-900)] border-b border-[var(--beam-zinc-700)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileEdit size={14} className="text-[var(--beam-tool-write)]" />
          <span className="text-xs font-medium text-[var(--beam-zinc-300)]">
            File Changes ({files.length})
          </span>
        </div>
      </div>

      <div className="divide-y divide-[var(--beam-zinc-800)]">
        {files.map((file) => {
          const isExpanded = expandedFiles.has(file.id);
          const isAccepted = acceptedFiles.has(file.id);
          const isRejected = rejectedFiles.has(file.id);

          return (
            <div key={file.id}>
              <div className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--beam-zinc-900)] transition-colors">
                <button onClick={() => toggleFile(file.id)} className="flex items-center gap-3 flex-1">
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[var(--beam-zinc-500)]"
                  >
                    <ChevronRight size={14} />
                  </motion.div>
                  {file.status === "new" ? (
                    <FilePlus size={14} className="text-[var(--beam-tool-write)]" />
                  ) : (
                    <FileEdit size={14} className="text-[var(--beam-accent-primary)]" />
                  )}
                  <span className="text-sm font-mono text-[var(--beam-zinc-300)]">{file.filename}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${getStatusColor(file.status)}20`,
                      color: getStatusColor(file.status),
                    }}
                  >
                    {getStatusLabel(file.status, file.additions, file.deletions)}
                  </span>
                </button>

                {!isAccepted && !isRejected && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => acceptFile(file.id)}
                      className="w-7 h-7 rounded-md bg-[var(--beam-tool-write)]/20 hover:bg-[var(--beam-tool-write)]/30 text-[var(--beam-tool-write)] transition-colors flex items-center justify-center"
                      title="Accept"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => rejectFile(file.id)}
                      className="w-7 h-7 rounded-md bg-[var(--beam-destructive)]/20 hover:bg-[var(--beam-destructive)]/30 text-[var(--beam-destructive)] transition-colors flex items-center justify-center"
                      title="Reject"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {isAccepted && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--beam-tool-write)]">
                    <Check size={12} />
                    <span>Accepted</span>
                  </div>
                )}

                {isRejected && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--beam-destructive)]">
                    <X size={12} />
                    <span>Rejected</span>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && file.diff && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-[var(--beam-black)] border-t border-[var(--beam-zinc-800)]">
                      <pre className="text-xs font-mono text-[var(--beam-zinc-400)] overflow-x-auto custom-scrollbar">
                        {file.diff}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 bg-[var(--beam-zinc-900)] border-t border-[var(--beam-zinc-700)] flex items-center gap-2">
        <button
          onClick={onAcceptAll}
          className="flex-1 px-4 py-2 text-xs rounded-md bg-[var(--beam-tool-write)] hover:bg-[var(--beam-tool-write)]/90 text-white font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Check size={12} />
          Accept All
        </button>
        <button
          onClick={onRejectAll}
          className="flex-1 px-4 py-2 text-xs rounded-md bg-[var(--beam-zinc-800)] hover:bg-[var(--beam-zinc-700)] text-[var(--beam-zinc-300)] font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <X size={12} />
          Reject All
        </button>
      </div>
    </motion.div>
  );
}
