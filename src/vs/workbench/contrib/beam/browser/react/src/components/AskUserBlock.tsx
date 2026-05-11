import { useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import { motion } from "framer-motion";

interface AskUserBlockProps {
  question: string;
  options?: string[];
  onSubmit?: (answer: string) => void;
  answer?: string;
}

export function AskUserBlock({ question, options, onSubmit, answer }: AskUserBlockProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [submitted, setSubmitted] = useState(!!answer);

  const handleSubmit = () => {
    const finalAnswer = options ? selectedOption : customAnswer;
    if (finalAnswer) {
      setSubmitted(true);
      onSubmit?.(finalAnswer);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="my-3 rounded-lg border border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-950)] p-4"
      >
        <div className="flex items-start gap-3">
          <MessageCircleQuestion size={16} className="text-[var(--beam-accent-primary)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-[var(--beam-zinc-500)] mb-1">Question</div>
            <div className="text-sm text-[var(--beam-zinc-300)] mb-2">{question}</div>
            <div className="text-xs text-[var(--beam-zinc-500)]">Answer</div>
            <div className="text-sm text-[var(--beam-zinc-200)] font-medium mt-1">
              {answer || selectedOption || customAnswer}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-lg border border-[var(--beam-accent-primary)]/50 bg-[var(--beam-zinc-950)] overflow-hidden"
    >
      <div className="px-4 py-3 bg-[var(--beam-accent-primary)]/5 border-b border-[var(--beam-accent-primary)]/30 flex items-center gap-3">
        <MessageCircleQuestion size={16} className="text-[var(--beam-accent-primary)]" />
        <span className="text-sm font-medium text-white">Input Required</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-sm text-[var(--beam-zinc-300)]">{question}</div>

        {options ? (
          <div className="space-y-2">
            {options.map((option, index) => (
              <label
                key={index}
                className="flex items-center gap-3 p-3 rounded-md border border-[var(--beam-zinc-800)] hover:border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-900)] cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="user-choice"
                  value={option}
                  checked={selectedOption === option}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-4 h-4 text-[var(--beam-accent-primary)] bg-[var(--beam-zinc-800)] border-[var(--beam-zinc-700)] focus:ring-[var(--beam-accent-primary)] focus:ring-2"
                />
                <span className="text-sm text-[var(--beam-zinc-300)]">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={customAnswer}
            onChange={(e) => setCustomAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-3 py-2 rounded-md bg-[var(--beam-zinc-900)] border border-[var(--beam-zinc-700)] text-sm text-[var(--beam-zinc-300)] placeholder-[var(--beam-zinc-500)] focus:outline-none focus:ring-2 focus:ring-[var(--beam-accent-primary)] transition-shadow"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={!(options ? selectedOption : customAnswer)}
          className="w-full px-4 py-2 text-sm rounded-md bg-[var(--beam-accent-primary)] hover:bg-[var(--beam-accent-primary-hover)] disabled:bg-[var(--beam-zinc-800)] disabled:text-[var(--beam-zinc-600)] text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Send size={14} />
          Submit
        </button>
      </div>
    </motion.div>
  );
}
