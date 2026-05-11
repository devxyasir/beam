import { Settings, X, Zap, Brain, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { useState } from "react";

export function SettingsModal() {
  const [autoSave, setAutoSave] = useState(true);
  const [streamResponse, setStreamResponse] = useState(true);
  const [temperature, setTemperature] = useState([0.7]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-9 h-9 rounded-lg bg-[var(--beam-zinc-900)] hover:bg-[var(--beam-zinc-800)] transition-colors flex items-center justify-center text-[var(--beam-zinc-400)] hover:text-[var(--beam-zinc-300)]">
          <Settings size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[var(--beam-zinc-900)] border-[var(--beam-zinc-700)] text-[var(--beam-zinc-300)] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-white">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Brain size={16} className="text-[var(--beam-accent-primary)]" />
              <span>Model</span>
            </div>
            <div className="pl-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--beam-zinc-300)]">Stream responses</p>
                  <p className="text-xs text-[var(--beam-zinc-500)]">
                    Display responses as they're generated
                  </p>
                </div>
                <Switch checked={streamResponse} onCheckedChange={setStreamResponse} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--beam-zinc-300)]">Temperature</p>
                  <span className="text-xs text-[var(--beam-zinc-500)]">{temperature[0]}</span>
                </div>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Editor Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Code size={16} className="text-[var(--beam-tool-write)]" />
              <span>Editor</span>
            </div>
            <div className="pl-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--beam-zinc-300)]">Auto-save changes</p>
                  <p className="text-xs text-[var(--beam-zinc-500)]">
                    Automatically save code modifications
                  </p>
                </div>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Zap size={16} className="text-[var(--beam-accent-purple)]" />
              <span>Appearance</span>
            </div>
            <div className="pl-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-3 rounded-lg bg-[var(--beam-zinc-800)] border-2 border-[var(--beam-accent-primary)] text-left">
                  <p className="text-sm font-medium text-white">Midnight Precision</p>
                  <p className="text-xs text-[var(--beam-zinc-500)]">Pure dark theme</p>
                </button>
                <button className="px-4 py-3 rounded-lg bg-[var(--beam-zinc-800)] border border-[var(--beam-zinc-700)] text-left hover:border-[var(--beam-zinc-600)] transition-colors">
                  <p className="text-sm font-medium text-white">Cyber Purple</p>
                  <p className="text-xs text-[var(--beam-zinc-500)]">Purple accents</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
