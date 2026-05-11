import { Code2, FileSearch, Zap, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface QuickActionProps {
  onAction: (prompt: string) => void;
}

const actions = [
  {
    icon: Code2,
    title: "Write Component",
    description: "Create a new React component",
    prompt: "Create a responsive card component with TypeScript",
    color: "var(--beam-tool-write)",
  },
  {
    icon: FileSearch,
    title: "Review Code",
    description: "Analyze and improve code",
    prompt: "Review my code for best practices and performance improvements",
    color: "var(--beam-tool-search)",
  },
  {
    icon: Zap,
    title: "Debug Issue",
    description: "Find and fix bugs",
    prompt: "Help me debug the authentication flow in my application",
    color: "var(--beam-tool-terminal)",
  },
  {
    icon: BookOpen,
    title: "Explain Code",
    description: "Understand complex logic",
    prompt: "Explain how this authentication middleware works",
    color: "var(--beam-accent-purple)",
  },
];

export function QuickActions({ onAction }: QuickActionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto mt-8">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onAction(action.prompt)}
            className="group p-4 rounded-xl bg-[var(--beam-zinc-900)] border border-[var(--beam-zinc-800)] hover:border-[var(--beam-zinc-700)] transition-all text-left"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${action.color}20`,
                }}
              >
                <Icon size={20} style={{ color: action.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white group-hover:text-[var(--beam-accent-primary)] transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-[var(--beam-zinc-500)] mt-0.5">
                  {action.description}
                </p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
