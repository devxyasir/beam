# Claude Prompt: Modular Windsurf-Style Chat Redesign

## Goal
Rewrite SidebarChat.tsx into clean modular components with Windsurf-like design. Existing files in `components/` need redesign, not just refactoring.

## Current Files to Rewrite
`src/vs/workbench/contrib/beam/browser/react/src/sidebar-tsx/components/`
- `designTokens.ts` - Add animation tokens, tool tints with opacity backgrounds
- `Icons.tsx` - Keep, add any missing icons
- `ToolHeader.tsx` - NEW: Windsurf-style tool card header (icon + title + subtitle + status badge + chevron)
- `ToolComponents.tsx` - NEW: Individual tool cards (read_file, edit_file, terminal, search, etc.) with colored tints
- `ReasoningBlock.tsx` - NEW: Purple card with animated thinking dots, collapsible
- `MessageComponents.tsx` - NEW: User message (no bubble, inline file chips), Assistant message (with action bar)
- `ChatInput.tsx` - NEW: Floating pill input with model selector badge, file chips above
- `SidebarChat.tsx` - NEW: Orchestrator using all components, under 300 lines

## Design Spec (Windsurf Style)

### Tool Cards (most important)
- Left border accent: 3px colored (blue=read, green=edit, amber=search, teal=terminal, purple=MCP)
- Colored icon (20px) in tinted rounded square
- Title: 13px bold white
- Subtitle (desc1): 11px monospace muted gray
- Status badge right side: "Done" (green pill), "Running" (animated dots), "Error" (red pill), "Rejected" (gray strike)
- Smooth collapsible (200ms height animation)
- Subtle tinted background (color at 3-5% opacity)
- Copy button on hover for code blocks

### User Messages
- NO bubble background
- Right-aligned text on background
- Inline file chips with colored file type icons
- Edit button appears on hover

### Assistant Messages
- Left-aligned, full width
- Prose wrapper for markdown
- Action bar below: Copy, Retry, Thumbs Up/Down

### Reasoning Block
- Purple-tinted card
- "THINKING" or "THOUGHTS" label in purple
- Animated 3-dot pulse when active
- Collapsible with smooth animation
- Shows reasoning time when done

### Chat Input
- Floating rounded container with shadow
- File chips displayed above input (not inside)
- Model selector as small accent pill (top-right)
- Send button: circular accent-colored button
- Stop button: square red button when streaming

## Technical Requirements
- Use Tailwind with existing beam tokens: `beam-bg-1`, `beam-fg-1`, etc.
- ESM imports need `.js` extension
- Export all from `components/index.tsx`
- Keep TypeScript strict - no `any` types
- Use React.memo for performance where appropriate
- Animations: CSS transitions for height/opacity, not JS animation libraries

## Reference
The original monolithic `SidebarChat.tsx` contains working logic at:
- `ToolHeaderWrapper` (lines 783-904)
- `SearchToolCard` (lines 1011-1062)
- `EditTool` (lines 1095-1154)
- `TerminalToolCard` (lines 1961-2016)
- `UserMessageComponent` (lines 1198-1411)
- `AssistantMessageComponent` (lines 1506-1557)
- `ReasoningWrapper` (lines 1559-1584)
- `CommandBarInChat` (lines 2958-3216)
- `AgentRunTimeline` (lines 2821-2867)

Extract the logic, redesign the UI. The monolith has all the functional code you need - your job is to make it modular and beautiful.

## Acceptance Criteria
1. SidebarChat.tsx under 300 lines (just imports, hooks, layout)
2. Each component file under 200 lines (single responsibility)
3. All existing functionality preserved (edit messages, accept/reject diffs, terminal attach, etc.)
4. Design matches Windsurf: tinted tool cards, inline file chips, floating input, purple reasoning
5. No TypeScript errors
6. Smooth animations on all collapsible elements

## Output Files
Rewrite these files completely:
1. `components/designTokens.ts`
2. `components/ToolHeader.tsx`
3. `components/ToolComponents.tsx`
4. `components/ReasoningBlock.tsx`
5. `components/MessageComponents.tsx`
6. `components/ChatInput.tsx`
7. `SidebarChat.tsx` (main orchestrator)
8. `components/index.tsx` (barrel exports)

Keep `components/Icons.tsx` mostly as-is, just add missing exports to index.
