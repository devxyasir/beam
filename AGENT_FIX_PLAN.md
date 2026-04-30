# Agentic IDE — Complete Fix & Build Plan
> Based on: codebase analysis (`chatThreadService.ts`, `prompts.ts`, `convertToLLMMessageService.ts`), UI screenshots, and the chat design spec HTML.

---

## Overview

You have two separate problems that both need fixing:

| # | Problem | Impact |
|---|---------|--------|
| 1 | **Prompt contradictions** — agent narrates instead of acting | Agent unusable in agent mode |
| 2 | **UI renders raw XML tool tags** in the chat bubble | Looks broken even when tools work |
| 3 | **No tool-execution UI cards** — blank screen during work | User has no feedback |
| 4 | **"ONE tool call per response"** rule — sequential reads | Extremely slow, 20+ round-trips for simple tasks |
| 5 | **Native + XML tool format conflict** in system message | LLM defaults to markdown output |

Fix these in order. Do not skip to UI polish before the agent actually works.

---

## Phase 1 — Fix the Agent Brain (prompts.ts)

**Files:** `prompts.ts` (the `chat_systemMessage` function and `if (mode === 'agent')` block)

### Step 1.1 — Move the Tool Mandate to the Header

The current prompt buries "ABSOLUTE RULE — USE TOOLS" in a numbered list at line ~490. The model ignores it because by then it has already started generating. Move it to **line 1** of the system message.

Replace the current `header` string with:

```typescript
const header = `You are an expert coding ${
  mode === 'agent'
    ? 'agent. Your ONLY way to create, edit, or run files is through tool calls.'
    : mode === 'gather'
    ? 'assistant focused on reading and understanding the codebase.'
    : 'assistant helping with coding tasks.'
}

${mode === 'agent' ? `⚠ MANDATORY: NEVER output file content as markdown code blocks. Code blocks in chat DO NOTHING. Only tool calls modify the file system.` : ''}

You will be given instructions from the user and optionally a list of selected files (SELECTIONS).`
```

---

### Step 1.2 — Rewrite the Agent Mode Instructions Block

Replace the entire `if (mode === 'agent') { details.push(...) }` block with the following. This removes all contradictions:

```typescript
if (mode === 'agent') {

  // ── Core behavior ────────────────────────────────────────────────
  details.push(
    `You are an autonomous coding agent with direct tool access. ` +
    `You accomplish tasks by calling tools — not by describing what you would do. ` +
    `If the user asks you to create or modify a file, immediately call the appropriate tool.`
  )

  // ── Absolute tool rule ───────────────────────────────────────────
  details.push(
    `NEVER output file contents as code blocks in chat. ` +
    `NEVER say "Here is the code:" and then show it. ` +
    `Code in chat has zero effect. ONLY tool calls have effects.`
  )

  // ── File creation workflow ───────────────────────────────────────
  details.push(
    `To create a file: call create_file_or_folder with the path. ` +
    `In your NEXT response, call rewrite_file with the full content. ` +
    `Never put file content in chat text.`
  )

  // ── Reading before writing ───────────────────────────────────────
  details.push(
    `Before editing any file, you MUST read it first with read_file. ` +
    `Never edit a file you have not read in this conversation.`
  )

  // ── Parallel reads (RESTORED) ────────────────────────────────────
  details.push(
    `PARALLEL READS: When you need to understand multiple files before acting, ` +
    `emit up to 5 read_file calls in a SINGLE response — they execute in parallel. ` +
    `Edits and commands must remain one at a time.`
  )

  // ── Brief reasoning before acting ───────────────────────────────
  details.push(
    `You may write 1–2 sentences before a tool call explaining what you are doing. ` +
    `Example: "Reading the auth middleware to understand the token flow." ` +
    `Do not write more than 2 sentences before acting. Do not write an essay then stop.`
  )

  // ── Planning rule (no contradiction) ────────────────────────────
  details.push(
    `For tasks requiring 3 or more steps: state your plan in ONE sentence, ` +
    `then immediately make your first tool call in the SAME response. ` +
    `Do not write a plan and then stop.`
  )

  // ── Edit quality ─────────────────────────────────────────────────
  details.push(
    `When using edit_file, the ORIGINAL block must match the file exactly ` +
    `character-for-character including whitespace. ` +
    `Include 3–5 lines of surrounding context to ensure uniqueness.`
  )

  // ── Completion signal (fixed — no more "every response must be a tool call") ──
  details.push(
    `When the task is fully complete, write a brief summary of what changed. ` +
    `The summary is plain text — no tool call is needed for it. ` +
    `Do NOT ask follow-up questions unless the task is genuinely impossible to finish ` +
    `without more information. If you can make a reasonable assumption, state it and proceed.`
  )

  // ── Verification ─────────────────────────────────────────────────
  details.push(
    `After editing a file, re-read the changed section with read_file to confirm correctness. ` +
    `If tests exist, run them with run_command to verify.`
  )

  // ── Safety ───────────────────────────────────────────────────────
  details.push(
    `Never run destructive commands (rm -rf, DROP TABLE, git reset --hard) ` +
    `without explicit user confirmation. ` +
    `Never modify files outside the user's workspace folders.`
  )
}
```

---

### Step 1.3 — Strip XML Tool Guidelines When Native Tools Are Active

In `chat_systemMessage`, when `includeXMLToolDefinitions` is `false` (i.e., native tool calling is being used via the API `tools` parameter), **do not inject XML tool format instructions**. The model already has the native schema from the API call. Mixing XML instructions with native tools confuses the model.

Current code (approximate):
```typescript
const toolDefs = includeXMLToolDefinitions ? systemToolsXMLPrompt(mode, mcpTools) : null
```

Ensure this is correctly gating ALL tool-format prose — including the XML calling guidelines section. If `includeXMLToolDefinitions` is `false`, the agent instructions should only say:

```
You have tools available. Use them to read, write, search, and execute.
```

Not 20 lines of XML syntax rules.

---

### Step 1.4 — Fix the Completion Protocol Conflict

Current prompt says: *"Each response must either (a) ask ONE clarifying question, or (b) make ONE tool call."*

This is wrong. A task-completion summary is neither a question nor a tool call, so the model gets confused about how to end. Remove this rule entirely. It is replaced by Step 1.2's completion signal instruction above.

---

## Phase 2 — Fix the Chat Renderer (Frontend)

**Files:** Your chat message renderer component (wherever `displayContent` is rendered to the screen)

### Step 2.1 — Strip XML Tool Tags from Display

This is the fix for what you saw in the screenshots — raw `<edit_file>`, `<search_replace_blocks>`, `<create_file_or_folder>` XML appearing as plaintext in the chat bubble.

Add a sanitizer that runs on every assistant message **before** rendering:

```typescript
/**
 * Strips XML tool call blocks from assistant messages before display.
 * These blocks are already handled by the backend — they should never be visible.
 */
export function sanitizeAgentMessageForDisplay(text: string): string {
  const TOOL_TAGS = [
    'create_file_or_folder',
    'edit_file',
    'rewrite_file',
    'read_file',
    'run_command',
    'ls_dir',
    'get_dir_tree',
    'search_for_files',
    'search_replace_blocks',
  ]

  let sanitized = text

  // Remove complete XML tool blocks
  for (const tag of TOOL_TAGS) {
    const pattern = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'g')
    sanitized = sanitized.replace(pattern, '')
  }

  // Remove CDATA sections (from search_replace_blocks)
  sanitized = sanitized.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')

  // Remove orphaned opening/closing tags
  sanitized = sanitized.replace(/<\/?(?:create_file_or_folder|edit_file|rewrite_file|read_file|run_command|ls_dir|get_dir_tree|search_for_files|search_replace_blocks)[^>]*>/g, '')

  return sanitized.trim()
}
```

Call this in your renderer wherever `message.displayContent` is passed to the markdown/text renderer.

---

### Step 2.2 — Parse Tool Calls and Generate Tool Cards

Instead of showing nothing (or raw XML), parse intercepted tool calls and render a **Tool Execution Card** in the chat. This is exactly what Windsurf does.

```typescript
export type ToolCardState = 'running' | 'done' | 'error'

export interface ToolCard {
  toolName: string
  params: Record<string, string>
  state: ToolCardState
  durationMs?: number
  errorMessage?: string
}

/**
 * Detects tool calls in a streaming assistant message.
 * Returns structured card data for the UI to render.
 */
export function extractToolCards(text: string): ToolCard[] {
  const cards: ToolCard[] = []
  
  const toolPatterns: Record<string, RegExp> = {
    read_file:             /<uri>(.*?)<\/uri>/s,
    create_file_or_folder: /<uri>(.*?)<\/uri>/s,
    rewrite_file:          /<uri>(.*?)<\/uri>/s,
    edit_file:             /<uri>(.*?)<\/uri>/s,
    run_command:           /<command>(.*?)<\/command>/s,
    search_for_files:      /<query>(.*?)<\/query>/s,
    ls_dir:                /<uri>(.*?)<\/uri>/s,
  }

  for (const [tool, paramRegex] of Object.entries(toolPatterns)) {
    const blockRegex = new RegExp(`<${tool}[\\s\\S]*?<\\/${tool}>`, 'g')
    const blocks = text.match(blockRegex) || []
    for (const block of blocks) {
      const paramMatch = block.match(paramRegex)
      cards.push({
        toolName: tool,
        params: { value: paramMatch?.[1]?.trim() ?? '' },
        state: 'done', // set to 'running' during streaming
      })
    }
  }

  return cards
}
```

---

## Phase 3 — Build the Tool Execution UI Cards

**Design tokens from your design spec:**
```
--bg: #0d0d0f       --blue: #4d9bff     --green: #3ddc84
--teal: #2dd9c0     --amber: #f5a623    --red: #ff5c57
--purple: #b57bee   Font: DM Mono (code), Syne (UI)
```

### Tool Card Visual Spec (per component from design file)

#### 3.1 — Read File Card (Teal)
```
┌─────────────────────────────────────────────┐
│ ≡  Reading…          [● pulse teal]         │
│    auth.ts  userService.ts  +4 more         │
├─────────────────────────────────────────────┤
│ ✓ Analyzed  📁 src/services/               │
│ ✓ Read      package.json                    │
└─────────────────────────────────────────────┘
```
- Teal `#2DD9C0` accent
- File names as clickable chips → opens file in editor
- Pulse dot during read, checkmark when complete

#### 3.2 — Create / Write File Card (Green)
```
┌─────────────────────────────────────────────┐
│ ⟨/⟩  Writing file                          │
│      app.py                   M↑  +42 -0   │
│ [diff lines]                               │
│              [Apply ✓]  [Reject ✗]         │
└─────────────────────────────────────────────┘
```
- Green `#3DDC84` accent
- Show diff: red for deletions, green for additions, dim for context
- Apply / Reject buttons per file
- "M↑" badge = Modified + unsaved

#### 3.3 — Terminal Card (Neutral / Error Red)
```
┌─────────────────────────────────────────────┐
│ $_  run_command          [● ● ●] terminal   │
│     npm run build                           │
├─────────────────────────────────────────────┤
│ > npm run build                             │
│   ✓ Compiled in 2.1s                        │   ← green
│   ✗ Error: Cannot find module './auth'      │   ← red
└─────────────────────────────────────────────┘
```
- Black terminal background `#000`
- Errors in `#FF5C57`, success in `#3DDC84`
- Collapsible — show last 5 lines, "expand" for full output
- Permission gate (amber) for destructive commands

#### 3.4 — Search Card (Amber)
```
┌─────────────────────────────────────────────┐
│ ⌕  Searching files…     [● pulse amber]    │
│    auth.ts          97% relevance           │
│    authGuard.ts     81%                     │
│    userService.ts   63%                     │
└─────────────────────────────────────────────┘
```
- Amber `#F5A623` accent
- All file names clickable

#### 3.5 — Thought Log / Stepper (Blue)

This wraps the entire agent turn. Render above the tool cards:

```
┌─────────────────────────────────────────────┐
│ [THINKING]  Refactoring Auth service  289s  │
├─────────────────────────────────────────────┤
│  ● ──  ✓  Analyzed project structure        │
│  │         extensions/html-language-feat…   │
│  ● ──  ✓  Read package.json                 │
│  │         Extracted deps and scripts       │
│  ● ── [●]  Architecting solution…  (active) │
│  ● ──  ○  Write changes  (pending)          │
├─────────────────────────────────────────────┤
│  ▸ Show verbose logs                  80s   │
└─────────────────────────────────────────────┘
```

- Blue `#4D9BFF` for active step (pulsing dot)
- Green dot for done steps
- Empty circle for pending steps
- "Show verbose logs" toggle reveals raw LLM output / shell stdout
- Collapses to one line when all steps done: `✓ Task complete — 289s`

#### 3.6 — Error Card (Red)
```
┌─────────────────────────────────────────────┐
│ ✕  Error while editing                      │
│    M↑ AGENT_ARCHITECTURE.md                 │
│    Conflict at line 87                      │
│           [View diff]    [↺ Retry]          │
└─────────────────────────────────────────────┘
```
- Red `#FF5C57` background tint, border `rgba(255,92,87,0.25)`
- Retry button re-sends the failed tool call
- Filename is clickable → opens file at error line

---

## Phase 4 — Reasoning Block Rendering

When the LLM emits reasoning/thinking text (before or between tool calls), render it as a **distinguished block** — not as normal assistant text.

### Detection
In your message stream, reasoning text appears before the first tool call. Tag it separately in your message model:

```typescript
interface ChatMessageSegment {
  type: 'reasoning' | 'text' | 'tool_card'
  content: string
  toolCard?: ToolCard
}
```

### Rendering
```
┌─────────────────────────────────────────────┐  ← purple left border
│ AGENT REASONING                             │  ← 9px uppercase purple label
│                                             │
│  The issue is the server extension wasn't   │
│  fully compiled — it needs htmlServerMain   │
│  in out/node/.                              │
│                                             │
│  What to fix in prompts.ts:                 │
│  • Move tool mandate to the header          │
│  • Strip XML guidelines for native tools    │
│  • Re-allow parallel reads                  │
└─────────────────────────────────────────────┘
```

- Left border: `2px solid #b57bee`
- Background: `rgba(181,123,238,0.1)`
- Label: `AGENT REASONING` in 9px `#b57bee` uppercase
- Supports full GFM markdown inside the block

---

## Phase 5 — Input Box

**Replace the plain textarea** with the full contextual input component.

### Features Required

| Feature | Implementation |
|---------|---------------|
| `@filename` autocomplete | On `@` keypress, open file picker popover. Selected file becomes a chip. |
| `#folder` autocomplete | On `#` keypress, open folder picker. |
| Current file chip | Auto-attach when user has a file open in editor. Show as `📄 current file` chip |
| Image paste | Listen for `paste` event, extract `image/*` items, attach as multimodal content |
| Context chips | Colored removable chips pinned above the textarea: blue for files, green for folders |
| Model selector | Dropdown badge showing current model. Click to switch. |
| Send button | Blue `#4D9BFF` rounded button, arrow icon |
| Voice button | Microphone icon, activates Web Speech API |

### Input Design Spec
```
┌─────────────────────────────────────────────┐
│ @ auth.ts ×   # src/services/ ×   📄 file  │  ← chips row
│                                             │
│  Refactor the auth flow to support OAuth2…  │  ← textarea
│                                             │
├─────────────────────────────────────────────┤
│  + <> Code    claude-sonnet-4-6 ▾    ◌ ⏺ ↑ │
└─────────────────────────────────────────────┘
```

- Background: `var(--surface3)` `#202025`
- Border: `0.5px solid rgba(255,255,255,0.12)`
- Border radius: `10px`
- Font: `Syne` for typed text, `DM Mono` for chips

---

## Phase 6 — Response Action Bar

Attach to the bottom of every completed agent response:

```
[ ⧉ Copy ]  [ ↺ Retry ]  [ ↑ Retry with different model ]  [ 👍 ]  [ 👎 ]  [ ⋯ More ]
```

| Button | Behavior |
|--------|----------|
| Copy | Copies sanitized text (no XML tags) to clipboard |
| Retry | Re-runs the last user message at temperature + 0.2 |
| Retry with different model | Opens model picker, then re-runs |
| 👍 / 👎 | Logs feedback to local RLHF store (SQLite or JSON file) |
| More | Dropdown: "Edit prompt", "Copy as markdown", "Delete message" |

### Styling
```css
.action-btn {
  padding: 4px 10px;
  border-radius: 5px;
  border: 0.5px solid rgba(255,255,255,0.12);
  background: #1a1a1f;
  font-size: 11px;
  color: #e8e6e0;
  font-family: 'Syne', sans-serif;
  font-weight: 600;
  cursor: pointer;
}
.action-btn:hover {
  border-color: rgba(255,255,255,0.22);
  background: #202025;
}
```

---

## Phase 7 — Context Window Meter + Git Branch Threads

### Token Usage Meter

Display in the chat header or sidebar top:

```
Context window          62k / 200k
████████░░░░░░░░░░░░░░  31% used
Clear chat when agent drifts
```

- Progress bar: gradient `#4D9BFF → #2DD9C0`
- Height: `3px`
- Label: amber color when > 70% used
- "Clear chat" link resets the thread

```typescript
// Track approximate token usage
function estimateTokenCount(messages: ChatMessage[]): number {
  const totalChars = messages.reduce((acc, m) => acc + (m.displayContent?.length ?? 0), 0)
  return Math.round(totalChars / 4) // rough 4-char-per-token approximation
}
```

### Git Branch Threads

Link each chat thread to a git branch via `simple-git` or VS Code's built-in git extension API:

```typescript
// When branch changes, switch the active thread
vscode.window.onDidChangeActiveTextEditor(async () => {
  const branch = await getCurrentGitBranch()
  const threadForBranch = chatThreads.find(t => t.gitBranch === branch)
  if (threadForBranch) {
    setActiveThread(threadForBranch.id)
  }
})
```

Display in chat header:
```
● main   12 messages
```
Green dot = active branch. Clicking shows branch thread switcher.

---

## Phase 8 — Design System Implementation

Apply these tokens globally in your extension's CSS:

```css
:root {
  --bg:          #0d0d0f;
  --surface:     #141417;
  --surface2:    #1a1a1f;
  --surface3:    #202025;
  --border:      rgba(255,255,255,0.07);
  --border2:     rgba(255,255,255,0.12);
  --text:        #e8e6e0;
  --muted:       #888580;
  --blue:        #4d9bff;
  --blue-dim:    rgba(77,155,255,0.12);
  --green:       #3ddc84;
  --green-dim:   rgba(61,220,132,0.1);
  --amber:       #f5a623;
  --amber-dim:   rgba(245,166,35,0.1);
  --red:         #ff5c57;
  --red-dim:     rgba(255,92,87,0.1);
  --purple:      #b57bee;
  --purple-dim:  rgba(181,123,238,0.1);
  --teal:        #2dd9c0;
  --teal-dim:    rgba(45,217,192,0.1);
}

/* Typography */
body, .chat-ui     { font-family: 'Syne', sans-serif; font-size: 13px; }
code, .mono, .chip { font-family: 'DM Mono', monospace; font-size: 11px; }

/* Glassmorphism sidebar */
.chat-sidebar-root {
  background: rgba(13,13,15,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Pulse animation */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.85); }
}
.dot-pulse { animation: pulse 1.4s ease-in-out infinite; }
```

### File Tree Highlights (VS Code Explorer)

When the agent modifies a file, highlight it in the Explorer sidebar:

```typescript
// Use VS Code file decoration API
class AgentFileDecorationProvider implements vscode.FileDecorationProvider {
  private _modifiedByAgent = new Set<string>()

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (this._modifiedByAgent.has(uri.fsPath)) {
      return {
        badge: '✦',
        color: new vscode.ThemeColor('charts.blue'), // Agent Blue
        tooltip: 'Modified by Agent',
      }
    }
  }

  markModified(filePath: string) {
    this._modifiedByAgent.add(filePath)
    this._onDidChangeFileDecorations.fire(vscode.Uri.file(filePath))
  }
}
```

---

## Implementation Order (Priority)

| Priority | Phase | What it fixes |
|----------|-------|---------------|
| 🔴 **P0** | Phase 1 | Agent stops narrating, starts acting |
| 🔴 **P0** | Phase 2.1 | Raw XML no longer shows in chat |
| 🟠 **P1** | Phase 2.2 + 3 | Tool cards render in chat |
| 🟠 **P1** | Phase 3.5 | Thought log / stepper visible |
| 🟡 **P2** | Phase 4 | Reasoning block styled correctly |
| 🟡 **P2** | Phase 5 | Input box with context chips |
| 🟢 **P3** | Phase 6 | Action bar on responses |
| 🟢 **P3** | Phase 7 | Token meter + git threads |
| 🔵 **P4** | Phase 8 | Full design system + file tree highlights |

---

## Files You Will Touch

| File | Changes |
|------|---------|
| `prompts.ts` | Rewrite agent mode instructions (Phase 1) |
| `convertToLLMMessageService.ts` | Ensure `includeXMLToolDefinitions` is `false` for native tool providers |
| `chatThreadService.ts` | Emit tool card events during `_runToolCall`, emit reasoning segment events during streaming |
| `ChatMessage` (renderer component) | Sanitize display content, render tool cards, render reasoning blocks |
| `ChatInput` (component) | Add chips, model selector, image paste, `@`/`#` autocomplete |
| `extension.ts` or `activate` | Register `AgentFileDecorationProvider` |
| CSS / styles | Apply design tokens, glassmorphism, pulse animations |

---

*This plan covers everything from a broken agent to a Windsurf-quality experience. Start with Phase 1 and Phase 2.1 — those two fixes alone will make the agent visibly work. The rest is progressive enhancement.*
