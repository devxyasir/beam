import { Plus, Clock, MoreVertical, X } from "lucide-react";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  title: string;
  active: boolean;
}

interface TabHeaderProps {
  tabs: Tab[];
  onTabChange?: (id: string) => void;
  onNewTab?: () => void;
  onCloseTab?: (id: string) => void;
}

export function TabHeader({ tabs, onTabChange, onNewTab, onCloseTab }: TabHeaderProps) {
  return (
    <div className="flex items-center border-b border-[var(--beam-zinc-800)] bg-[var(--beam-zinc-950)]">
      <div className="flex-1 flex items-center overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={`group relative px-4 py-2.5 flex items-center gap-2 border-r border-[var(--beam-zinc-800)] transition-colors ${
              tab.active
                ? "bg-[var(--beam-black)] text-white"
                : "bg-[var(--beam-zinc-950)] text-[var(--beam-zinc-500)] hover:text-[var(--beam-zinc-300)] hover:bg-[var(--beam-zinc-900)]"
            }`}
          >
            <span className="text-sm whitespace-nowrap">{tab.title}</span>
            {tab.active && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--beam-accent-primary)]"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab?.(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-[var(--beam-zinc-800)] rounded p-0.5 transition-all"
            >
              <X size={12} />
            </button>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 px-2 border-l border-[var(--beam-zinc-800)]">
        <button
          onClick={onNewTab}
          className="w-8 h-8 rounded-md hover:bg-[var(--beam-zinc-900)] transition-colors flex items-center justify-center text-[var(--beam-zinc-500)] hover:text-[var(--beam-zinc-300)]"
          title="New tab"
        >
          <Plus size={16} />
        </button>
        <button className="w-8 h-8 rounded-md hover:bg-[var(--beam-zinc-900)] transition-colors flex items-center justify-center text-[var(--beam-zinc-500)] hover:text-[var(--beam-zinc-300)]">
          <Clock size={16} />
        </button>
        <button className="w-8 h-8 rounded-md hover:bg-[var(--beam-zinc-900)] transition-colors flex items-center justify-center text-[var(--beam-zinc-500)] hover:text-[var(--beam-zinc-300)]">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
}
