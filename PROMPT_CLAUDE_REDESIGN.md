# Beam Chat — Complete Windsurf-Style Redesign (From Scratch)

## Setup
1. Rename ALL files in `components/` to `*_old.tsx`
2. Rename `SidebarChat.tsx` to `SidebarChat_old.tsx`
3. Create every file below from scratch using ONLY inline CSS (no Tailwind classes)

## File 1: designTokens.ts
Export objects: colors (bg.base='#0d0d0f', bg.elevated='#18181b'), tints (each has bg=4% opacity rgba, border=solid, icon=bright color: blue=read, green=edit, amber=search, red=error, purple=MCP/reasoning, teal=terminal, gray=rejected), textColors (primary='#fafafa', secondary='#e4e4e7', tertiary='#a1a1aa'), typography (xs=11px, sm=12px, base=13px, label=9px uppercase tracking-wider), spacing (xs=4px, sm=8px, md=12px, lg=16px), transitions (fast=150ms, normal=200ms, slow=300ms, all cubic-bezier(0.4,0,0.2,1)).

## File 2: Icons.tsx
20+ SVG icon components (16x16 default, currentColor stroke). Export: IconX, IconLoading (animated spinner), IconArrowUp, IconSquare, IconWarning, IconCheck, IconChevronDown, IconChevronRight, IconFile, IconFolder, IconTerminal, IconSearch, IconEdit, IconCopy, IconRefresh, IconThumbsUp, IconThumbsDown, IconDots, IconSparkles, IconBrain, IconDotPulse (3 dots with staggered opacity animation).

## File 3: ToolHeader.tsx
Props: icon, title, subtitle, status ('running'|'success'|'error'|'rejected'), tint, isOpen, onToggle, children, rightAction. Card: bg=tints[tint].bg, borderLeft=3px solid tints[tint].border, borderRadius=6px. Header: flex row, padding=10px 12px, gap=10px. Icon container: 28x28, borderRadius=6px, centered. Title: 13px, weight=500, color=primary. Subtitle: 11px monospace, tertiary, truncate. Status badge (pill): Running=blue bg+animated dots, Success=green bg, Error=red bg, Rejected=gray+strikethrough. Chevron: rotate 90deg when open, 200ms transition. Content: maxHeight 0→auto transition, 200ms.

## File 4: ToolComponents.tsx
One component per tool using ToolHeader with correct tint/icon: ReadFileTool (blue, IconFile, code block with copy button), EditFileTool (green, IconEdit, +N/-N stats, diff view with red/green lines, Accept/Reject buttons), TerminalTool (teal, IconTerminal, command output, exit code badge), SearchTool (amber, IconSearch, file results with relevance %), DirectoryTool (amber, IconFolder, file grid), FileOperationTool (green/red, IconFile, create/delete), LintErrorsTool (red, IconWarning, error list with line:column), MCPTool (purple, IconSparkles, JSON content), GenericToolSoFar (gray, spinning IconLoading, "Calling...").

## File 5: ReasoningBlock.tsx
Purple tinted card (tint=purple). Header: "AGENT REASONING" or "THINKING" in purple uppercase 9px label. When streaming: animated 3-dot pulse + "Thinking..." text. When done: show reasoning time. Collapsible with smooth height animation. Content in prose wrapper.

## File 6: MessageComponents.tsx
UserMessage: NO bubble background. Right-aligned text on base bg. Inline file chips with colored file type icons (small rounded square with file extension icon). Edit button appears on hover (pencil icon, top-left of message). AssistantMessage: Left-aligned, full width. Prose wrapper for markdown. Action bar below: Copy, Retry, Thumbs Up/Down. StreamingIndicator: "Thinking" or "Working" with animated dots.

## File 7: ChatInput.tsx
Floating rounded container (not flat border). Background=bg.input, borderRadius=12px, boxShadow subtle. Textarea: transparent bg, no border, placeholder text. File chips displayed ABOVE input (not inside). Model selector: small accent-colored pill (top-right of container). Send button: circular accent-colored button with IconArrowUp. Stop button: square red button when streaming. Auto-resize textarea height.

## File 8: SidebarChat.tsx (Main Orchestrator — UNDER 200 LINES)
Import all from components. Use hooks: accessor, chatThreadsState, streamState. Render: header (thread selector + settings), messages scroll container (map messages to UserMessage/AssistantMessage/ToolMessage/ReasoningBlock), floating input area (ChatInput). Handle submit/abort logic. Keep it minimal — all rendering logic lives in component files.

## File 9: index.tsx
Barrel export all components with .js extensions for ESM.

## Design Rules
- EVERY tool gets a colored card with left border accent
- NO flat gray backgrounds on tool cards
- User messages have NO bubble — just right-aligned text
- Input area floats with rounded corners and shadow
- All collapsible elements animate height + opacity (200ms)
- Status badges are pills with tinted backgrounds
- Use inline styles with designTokens values (no Tailwind classes)
- Export .js extensions for all internal imports

## Acceptance
- SidebarChat.tsx < 200 lines
- Each component file < 250 lines
- Zero TypeScript errors
- All existing functionality preserved (edit messages, accept/reject diffs, terminal, etc.)
- Windsurf visual style: tinted tool cards, inline file chips, floating input, purple reasoning
