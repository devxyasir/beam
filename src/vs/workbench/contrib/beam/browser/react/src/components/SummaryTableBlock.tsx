import { Table } from "lucide-react";
import { motion } from "framer-motion";

interface TableRow {
  tool: string;
  purpose: string;
  example: string;
}

interface SummaryTableBlockProps {
  title: string;
  rows: TableRow[];
}

export function SummaryTableBlock({ title, rows }: SummaryTableBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-lg border border-[var(--beam-zinc-700)] bg-[var(--beam-zinc-950)] overflow-hidden"
    >
      <div className="px-4 py-3 bg-[var(--beam-zinc-900)] border-b border-[var(--beam-zinc-700)] flex items-center gap-3">
        <Table size={14} className="text-[var(--beam-accent-primary)]" />
        <span className="text-xs font-medium text-[var(--beam-zinc-300)]">{title}</span>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--beam-zinc-800)]">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--beam-zinc-500)] bg-[var(--beam-zinc-900)]">
                Tool
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--beam-zinc-500)] bg-[var(--beam-zinc-900)]">
                Purpose
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--beam-zinc-500)] bg-[var(--beam-zinc-900)]">
                Example Usage
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-[var(--beam-zinc-800)] hover:bg-[var(--beam-zinc-900)] transition-colors"
              >
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-[var(--beam-accent-primary)]">
                    {row.tool}
                  </code>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--beam-zinc-300)]">{row.purpose}</td>
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-[var(--beam-zinc-400)] bg-[var(--beam-black)] px-2 py-1 rounded">
                    {row.example}
                  </code>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
