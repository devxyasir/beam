import { useState } from "react";
import { Copy, Check, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeBlockProps {
  code: string;
  language?: string;
  onApply?: () => void;
}

export function CodeBlock({ code, language = "typescript", onApply }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group my-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="elevated rounded-lg overflow-hidden border border-[var(--beam-zinc-700)]">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--beam-black)] border-b border-[var(--beam-zinc-700)]">
          <span className="text-xs font-mono text-[var(--beam-zinc-400)]">{language}</span>
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                {onApply && (
                  <button
                    onClick={onApply}
                    className="px-3 py-1 text-xs rounded-md bg-[var(--beam-accent-primary)] text-white hover:bg-[var(--beam-accent-primary-hover)] transition-colors flex items-center gap-1.5"
                  >
                    <Play size={12} />
                    Apply
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-xs rounded-md bg-[var(--beam-zinc-700)] text-[var(--beam-zinc-300)] hover:bg-[var(--beam-zinc-600)] transition-colors flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check size={12} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <pre className="px-4 py-3 overflow-x-auto custom-scrollbar bg-[var(--beam-black)]">
          <code className="text-sm font-mono text-[var(--beam-zinc-300)] leading-relaxed">
            {code}
          </code>
        </pre>
      </div>
    </motion.div>
  );
}
