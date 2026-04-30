# Prompt for Next Agent - Beam SidebarChat Refactor

## What Has Been Completed

### ✅ Modular Component Library Created
Created 7 new modular component files in `src/vs/workbench/contrib/beam/browser/react/src/sidebar-tsx/components/`:

1. **`designTokens.ts`** - Design system with colors, typography, spacing matching Windsurf spec
   - `tintClasses`: blue, green, amber, red, purple, teal, gray color tokens
   - `colors`: CSS variable values from agentic_ide_chat_design_plan.html
   - `typography`: text sizing utilities
   - `layout`: card, chip, tag layouts

2. **`Icons.tsx`** - 20+ Lucide-style icon components
   - IconX, IconLoading, IconArrowUp, IconSquare, IconWarning, IconCheck
   - IconChevronDown, IconChevronRight, IconFile, IconFolder, IconTerminal
   - IconSearch, IconEdit, IconCopy, IconRefresh, IconThumbsUp, IconThumbsDown
   - IconDots, IconSparkles, IconBrain, IconDotPulse

3. **`ToolHeader.tsx`** - Tool card wrapper components
   - `ToolHeaderWrapper`: Collapsible tool cards with tint coloring
   - `ToolChildrenWrapper`: Content container
   - `CodeChildren`: Code block renderer
   - `FileChip`: File reference chips
   - `ToolStatusBadge`: Running/success/error status badges

4. **`ReasoningBlock.tsx`** - Agent reasoning UI (purple styling)
   - `ReasoningBlock`: Purple-bordered reasoning cards
   - `ReasoningSoFar`: Streaming thinking indicator
   - `ReasoningStepper`: Step-by-step progress indicator
   - `ReasoningCard`: Full reasoning card with logs toggle

5. **`ChatInput.tsx`** - Input components
   - `BeamChatArea`: Main input container with model dropdown
   - `ChatInput`: Textarea with @/# autocomplete
   - `ChatModeDropdown`: Agent/Chat/Ask selector
   - `ModelDropdown`: Model selector
   - `AutocompletePopup`: File/symbol autocomplete
   - `ButtonSubmit`, `ButtonStop`: Action buttons
   - `SelectedFiles`: File chips display

6. **`MessageComponents.tsx`** - Message rendering
   - `UserMessage`: User bubble with file attachments
   - `AssistantMessage`: Assistant response with action bar
   - `ProseWrapper`, `SmallProseWrapper`: Markdown content wrappers
   - `MessageActionBar`: Copy/retry/feedback buttons
   - `CopyButton`: Clipboard copy with feedback
   - `StreamingIndicator`: Loading animation

7. **`ToolComponents.tsx`** - Individual tool UIs
   - `ReadFileTool`: File display with syntax highlighting (blue tint)
   - `EditFileTool`: Code diff/rewrite display (green tint)
   - `TerminalTool`: Command output with exit code (teal tint)
   - `SearchTool`: Search results list (amber tint)
   - `DirectoryTool`: Folder contents grid (amber tint)
   - `FileOperationTool`: Create/delete confirmation (green/red tint)
   - `LintErrorsTool`: Diagnostics display (error/warning/info colors)
   - `MCPTool`: Generic MCP tool wrapper (purple tint)
   - `GenericToolSoFar`: Streaming tool indicator
   - `titleOfBuiltinToolName`: Tool title mappings
   - `isABuiltinToolName`: Type guard

8. **`index.ts`** - Barrel exports for all components with `.js` extensions for ESM

### ✅ SidebarChat.tsx Started (But Incomplete)
Created new `SidebarChat.tsx` with:
- Clean imports from `./components/index.js`
- Basic component structure
- `ToolMessageComponent` for rendering tools
- `ToolCallSoFarComponent` for streaming tools
- `ChatMessageComponent` for messages
- Main `SidebarChat` component with hooks

## What Needs To Be Fixed

### 🔴 Critical: TypeScript Errors in SidebarChat.tsx

The new `SidebarChat.tsx` has ~30 TypeScript errors because I used incorrect ChatMessage properties:

**Error Categories:**

1. **ChatMessage type issues** (lines 302-353)
   - Assistant messages use `displayContent` not `content`
   - Assistant messages don't have `tool_calls`, `toolResults`, or `id` in current type
   - User messages have `state.stagingSelections` not `stagingSelections` directly
   - ToolMessage requires type parameter

2. **Service state issues** (lines 395-435)
   - `chatThreadService.threads` property doesn't exist on type
   - `commandBarState.recentFiles` doesn't exist
   - Stream state indexing issues

3. **Missing properties** (lines 516-517)
   - `toolCallSoFar` doesn't exist on stream state type

4. **FeatureName mismatch** (line 532)
   - Type includes values not in FeatureName enum

### 🔴 Action Required

**Option 1: Fix existing SidebarChat.tsx**
- Correct all ChatMessage property accesses to match actual type definition
- Fix service state property accesses
- Add proper type guards for message role checks
- Use `displayContent` for assistant messages
- Access `message.state.stagingSelections` for user messages

**Option 2: Rewrite from SidebarChat1.tsx**
- The original file was renamed to `SidebarChat1.tsx`
- Extract working patterns from it
- Replace broken tool rendering sections with new modular components
- Keep working logic, replace broken parts

### 🟡 Component Polish (Lower Priority)

- Ensure all component files use `.js` extensions in imports (ESM requirement)
- Remove duplicate exports in `index.ts` if any
- Verify design tokens match HTML spec exactly

## Files to Work With

```
src/vs/workbench/contrib/beam/browser/react/src/sidebar-tsx/
├── SidebarChat.tsx          # NEW - needs fixes
├── SidebarChat1.tsx         # OLD - reference for working code
├── components/
│   ├── index.ts             # Barrel exports - ✅ done
│   ├── designTokens.ts      # Colors - ✅ done
│   ├── Icons.tsx            # Icons - ✅ done
│   ├── ToolHeader.tsx       # Tool cards - ✅ done
│   ├── ReasoningBlock.tsx   # Reasoning - ✅ done
│   ├── ChatInput.tsx        # Input - ✅ done
│   ├── MessageComponents.tsx # Messages - ✅ done
│   └── ToolComponents.tsx   # Tool UIs - ✅ done
```

## Reference Files

- `AGENT_FIX_PLAN.md` - Contains phases and design requirements
- `agentic_ide_chat_design_plan.html` - Visual design reference
- `src/vs/workbench/contrib/beam/common/chatThreadServiceTypes.ts` - ChatMessage type definition
- `src/vs/workbench/contrib/beam/browser/react/src/util/services.ts` - Hook/service types

## Goal

Get `SidebarChat.tsx` to compile without TypeScript errors while using the new modular components. The component should render chat messages, tool calls, and input correctly with the Windsurf-like styling from the design tokens.
