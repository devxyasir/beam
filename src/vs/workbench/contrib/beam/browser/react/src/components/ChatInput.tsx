import React, { useState, useRef, KeyboardEvent, forwardRef, useImperativeHandle } from "react";
import { Paperclip, Send, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

export interface ChatInputFns {
  setValue: (val: string) => void;
  focus: () => void;
}

interface ChatInputProps {
  onSend: (message?: string) => void;
  onAbort?: () => void;
  onAttach?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  selectedModel?: string;
  onModelClick?: () => void;
  fnsRef?: React.RefObject<ChatInputFns>;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(({
  onSend,
  onAbort,
  onAttach,
  isStreaming,
  placeholder = "Ask anything...",
  selectedModel = "Claude 3.5 Sonnet",
  onModelClick,
  fnsRef
}, ref) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);

  // Merge external ref with internal ref
  useImperativeHandle(ref, () => internalRef.current!);
  
  useImperativeHandle(fnsRef, () => ({
    setValue: (val: string) => {
      setMessage(val);
      if (internalRef.current) {
        internalRef.current.style.height = "auto";
      }
    },
    focus: () => {
      internalRef.current?.focus();
    }
  }));

  const handleSend = () => {
    if (isStreaming && onAbort) {
      onAbort();
    } else if (message.trim()) {
      onSend(message);
      setMessage("");
      if (internalRef.current) {
        internalRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape" && isStreaming && onAbort) {
      onAbort();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="p-4 bg-gradient-to-t from-[var(--beam-black)] to-transparent">
      <motion.div
        animate={{
          boxShadow: isFocused
            ? "0 0 0 2px var(--beam-accent-primary-glow), 0 4px 12px rgba(0, 0, 0, 0.4)"
            : "0 1px 4px rgba(0, 0, 0, 0.3)",
        }}
        transition={{ duration: 0.2 }}
        className="glass rounded-xl overflow-hidden"
      >
        {/* Model Selector */}
        <div className="px-3 py-1.5 border-b border-[var(--beam-glass-border)] flex items-center justify-between bg-[var(--beam-zinc-900)]/50">
          <button 
            onClick={onModelClick}
            className="flex items-center gap-1.5 text-[11px] text-[var(--beam-zinc-400)] hover:text-[var(--beam-zinc-300)] transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--beam-accent-primary)]" />
            <span className="font-medium">{selectedModel}</span>
            <ChevronDown size={12} />
          </button>
          <div className="flex items-center gap-2 opacity-50">
             <span className="text-[10px] text-[var(--beam-zinc-500)]">Shift+Enter for new line</span>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2 p-3">
          <button
            onClick={onAttach}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--beam-zinc-800)] hover:bg-[var(--beam-zinc-700)] transition-colors flex items-center justify-center text-[var(--beam-zinc-400)] hover:text-[var(--beam-zinc-300)]"
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>

          <textarea
            ref={internalRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-[var(--beam-zinc-200)] placeholder-[var(--beam-zinc-500)] resize-none outline-none text-[13px] leading-relaxed min-h-[32px] max-h-[160px] custom-scrollbar py-1"
          />

          <button
            onClick={handleSend}
            disabled={!message.trim() && !isStreaming}
            className={`flex-shrink-0 w-8 h-8 rounded-lg transition-all flex items-center justify-center text-white
              ${isStreaming 
                ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" 
                : "bg-[var(--beam-accent-primary)] hover:bg-[var(--beam-accent-primary-hover)] disabled:bg-[var(--beam-zinc-800)] disabled:text-[var(--beam-zinc-600)]"
              }`}
            title={isStreaming ? "Stop generation" : "Send message"}
          >
            {isStreaming ? (
              <div className="w-3 h-3 bg-current rounded-sm" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
});

