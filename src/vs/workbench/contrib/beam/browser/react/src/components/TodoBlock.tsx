import { useState } from "react";
import { ChevronRight, ListTodo, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoBlockProps {
  title: string;
  tasks: TodoItem[];
  defaultExpanded?: boolean;
}

export function TodoBlock({ title, tasks, defaultExpanded = true }: TodoBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-lg border border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-950)] overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--beam-zinc-900)] transition-colors"
      >
        <ListTodo size={16} className="text-[var(--beam-accent-primary)] flex-shrink-0" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-[var(--beam-zinc-800)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-[var(--beam-accent-primary)]"
              />
            </div>
            <span className="text-xs text-[var(--beam-zinc-500)]">
              {completedCount}/{totalCount}
            </span>
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-[var(--beam-zinc-800)] space-y-2">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-[var(--beam-zinc-900)] transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 size={16} className="text-[var(--beam-tool-write)] flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-[var(--beam-zinc-600)] flex-shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-sm ${
                      task.completed ? "text-[var(--beam-zinc-500)] line-through" : "text-[var(--beam-zinc-300)]"
                    }`}
                  >
                    {task.title}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
