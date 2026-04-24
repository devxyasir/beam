# Beam Agentic AI System - Technical Architecture Report

## Executive Summary

This document provides a complete technical breakdown of the agentic AI system powering Beam (formerly Void), a Cursor/Windsurf-level agentic coding IDE. The system is built as a VS Code fork with a sophisticated multi-step agent loop, tool orchestration, and context management system.

---

## 1. 🧩 Agent Orchestration System

### 1.1 Entry Point & Task Flow

**User Prompt Entry:**
- User input enters via `ChatThreadService.startNewThread()` or `continueChatThread()`
- Stored in thread state as messages with roles: 'user' | 'assistant' | 'tool' | 'interrupted_streaming_tool' | 'checkpoint'

**Chat Modes (Task Classification):**
```typescript
type ChatMode = 'normal' | 'gather' | 'agent'
```

- **normal**: Simple Q&A, no tool access
- **gather**: Context gathering mode, read/search tools only (no edits)
- **agent**: Full agent mode, all tools including edit/terminal

### 1.2 The Agent Loop Core

The agent loop is implemented in `ChatThreadService._runChatThread()`:

```typescript
while (shouldSendAnotherMessage) {
    shouldSendAnotherMessage = false
    
    // 1. Build context from message history
    const { messages, separateSystemMessage } = await this._convertToLLMMessagesService.prepareLLMChatMessages({...})
    
    // 2. Call LLM with streaming
    const llmCancelToken = this._llmMessageService.sendLLMMessage({
        messagesType: 'chatMessages',
        messages,
        chatMode,
        onText: (streamingUpdate) => { /* update UI */ },
        onFinalMessage: (result) => { /* handle tool call */ }
    })
    
    // 3. Check for tool call in response
    if (llmRes.toolCall) {
        const toolResult = await this._runToolCall(threadId, toolCall)
        
        // 4. Continue loop with tool result
        if (!interrupted) {
            shouldSendAnotherMessage = true
        }
    }
}
```

### 1.3 Multi-Step Reasoning Flow

**Iteration Control:**
- Counter: `nMessagesSent` tracks turns
- Max retries: `CHAT_RETRIES = 3` with `RETRY_DELAY = 3000ms`
- Pre-approved tools can skip confirmation (e.g., user previously approved 'edits')

**Tool Pre-execution:**
```typescript
if (callThisToolFirst) {
    await this._runToolCall(threadId, callThisToolFirst.name, ...)
}
```

---

## 2. 🤖 LLM Call Architecture

### 2.1 IPC-Based Communication

The system uses a multi-process architecture:
- **Renderer Process**: UI, React components, state management
- **Main Process**: LLM API calls, file system operations, terminal execution
- **Communication**: IPC channels via `IMainProcessService`

**Channel Setup:**
```typescript
this.channel = this.mainProcessService.getChannel('void-channel-llmMessage')
```

### 2.2 Message Structure

**Service-to-Main Payload:**
```typescript
interface MainSendLLMMessageParams {
    messagesType: 'chatMessages' | 'FIM' | 'apply'
    messages: ChatMessage[]
    chatMode: ChatMode
    modelSelection: ModelSelection
    modelSelectionOptions: ModelSelectionOptions
    overridesOfModel: OverridesOfModel
    separateSystemMessage: string | null
    mcpTools: InternalToolInfo[] | undefined
}
```

### 2.3 Provider Routing & Abstraction

**Provider Abstraction Layer:**
All providers implement a common interface in `sendLLMMessage.impl.ts`:
- OpenAI (GPT-4, GPT-4o, etc.)
- Anthropic (Claude 3.5 Sonnet, Opus, etc.)
- Google (Gemini)
- OpenRouter (unified API)
- Ollama (local models)
- Azure OpenAI
- AWS Bedrock
- vLLM, LM Studio, LiteLLM (local proxies)

**Provider-Specific Implementation:**
```typescript
// Anthropic
const anthropic = new Anthropic({ apiKey: settings.apiKey })
anthropic.messages.create({
    model: modelName,
    messages: formattedMessages,
    tools: tools,
    max_tokens: 8000,
    system: separateSystemMessage
})

// OpenAI
const openai = new OpenAI({ apiKey: settings.apiKey })
openai.chat.completions.create({
    model: modelName,
    messages: [{ role: 'system', content: separateSystemMessage }, ...messages],
    tools: tools,
    stream: true
})
```

### 2.4 Streaming Response Architecture

**Streaming Flow:**
1. Main process initiates streaming API call
2. Chunks flow through IPC channel `onText_sendLLMMessage`
3. Renderer process updates React state via `onText` callback
4. Full message accumulated and returned via `onFinalMessage`

**Stream State Management:**
```typescript
// In ChatThreadService
onText: ({ fullText, fullReasoning, toolCall }) => {
    this._setStreamState(threadId, {
        isRunning: 'LLM',
        llmInfo: {
            displayContentSoFar: fullText,
            reasoningSoFar: fullReasoning,
            toolCallSoFar: toolCall ?? null
        }
    })
}
```

### 2.5 Retry & Error Handling

**Retry Logic:**
```typescript
while (shouldRetryLLM) {
    shouldRetryLLM = false
    nAttempts += 1
    
    const llmRes = await sendLLMMessage(...)
    
    if (llmRes.type === 'llmError') {
        if (nAttempts < CHAT_RETRIES) {
            shouldRetryLLM = true
            await timeout(RETRY_DELAY)
        }
    }
}
```

---

## 3. 🧠 Context Engine

### 3.1 System Message Architecture

The system message is dynamically constructed from multiple components:

```typescript
function chat_systemMessage({
    workspaceFolders,
    openedURIs,
    activeURI,
    persistentTerminalIDs,
    directoryStr,
    chatMode,
    mcpTools,
    includeXMLToolDefinitions
}): string
```

**Components (in order):**

1. **Header** - Role definition based on chatMode
2. **System Info** - OS, workspace folders, active file, open files, terminal IDs
3. **File System Overview** - Directory tree structure
4. **Tool Definitions** - XML-formatted tool schemas (agent/gather mode)
5. **Important Details** - Instructions, constraints, formatting rules
6. **User Selections** - @mentioned files appended as "SELECTIONS" section

### 3.2 File Context Injection

**User Selection Types:**
```typescript
type StagingSelectionItem = 
    | { type: 'CodeSelection', uri: URI, range: [number, number], language: string }
    | { type: 'File', uri: URI, language: string }
    | { type: 'Folder', uri: URI }
```

**Context Assembly:**
```typescript
export const chat_userMessageContent = async (instructions, currSelns) => {
    const selnsStrs = await Promise.all(
        currSelns.map(s => messageOfSelection(s, opts))
    )
    
    let str = instructions
    const selnsStr = selnsStrs.join('\n\n')
    if (selnsStr) str += `\n---\nSELECTIONS\n${selnsStr}`
    return str
}
```

### 3.3 Workspace State Tracking

**Tracked State:**
- `workspaceFolders`: Root directories open in workspace
- `openedURIs`: Currently open files
- `activeURI`: Active editor file
- `persistentTerminalIDs`: Long-running terminal IDs
- `directoryStr`: Full directory tree (capped at 20k chars)

---

## 4. ✂️ Chunking System

### 4.1 No Traditional Chunking

**IMPORTANT:** This system does NOT use traditional chunking/embedding-based RAG.

Instead, it uses:
- **File-level context**: Entire files or line ranges
- **Directory tree**: Hierarchical file structure overview
- **Search-based retrieval**: Grep-style search for relevant files

### 4.2 Pagination for Large Files

**File Reading Limits:**
```typescript
export const MAX_FILE_CHARS_PAGE = 500_000
export const DEFAULT_FILE_SIZE_LIMIT = 2_000_000
```

**Pagination Strategy:**
```typescript
const readFile = async (fileService, uri, fileSizeLimit) => {
    const fileContent = await fileService.readFile(uri)
    const val = fileContent.value.toString()
    if (val.length > fileSizeLimit) {
        return {
            val: val.substring(0, fileSizeLimit),
            truncated: true,
            fullFileLen: val.length
        }
    }
    return { val, truncated: false, fullFileLen: val.length }
}
```

### 4.3 Folder Selection Expansion

When user @mentions a folder:
```typescript
const dirStr = await directoryStrService.getDirectoryStrTool(uri)
const folderStructure = `${uri.fsPath} folder structure:\`\`\`\n${dirStr}\`\`\``

const uris = await directoryStrService.getAllURIsInDirectory(uri, {
    maxResults: 100,
    maxCharsPerFile: 100_000
})
```

---

## 5. 🔎 Embedding System

### 5.1 NO Vector Database

**Critical Finding:** This system does NOT use embeddings, vector DB, or semantic search.

**Rationale:**
- Simple keyword/search-based retrieval is sufficient for coding tasks
- File-level context provides better coherence than chunk-level
- Reduces system complexity and latency

---

## 6. 📚 RAG System (Retrieval Augmented Generation)

### 6.1 Search-Based Retrieval Pipeline

**Available Tools for Context Gathering:**

```typescript
const builtinTools = {
    // Context gathering
    read_file: { /* read file contents with line range */ },
    ls_dir: { /* list directory contents */ },
    get_dir_tree: { /* full directory tree */ },
    search_pathnames_only: { /* search file names */ },
    search_for_files: { /* grep content search */ },
    search_in_file: { /* find lines matching query */ },
    read_lint_errors: { /* read lint diagnostics */ }
}
```

**Search Implementation:**
- File name search: substring matching
- Content search: substring or regex matching
- Results ranked by relevance (no semantic scoring)

### 6.2 Context Injection Flow

```
User Query + @mentions
        |
        v
[Context Builder] 
        |
        +--> System Info (OS, workspace, files)
        +--> Directory Structure
        +--> User Selections (files/ranges/folders)
        +--> Tool Definitions (if agent mode)
        |
        v
[LLM Call]
        |
        v
[Tool Call Detected?] --YES--> [Execute Tool] --> [Result Appended] --> [Loop]
        |
       NO
        v
[Final Response]
```

---

## 7. 🌐 Search System

### 7.1 Codebase Search Tools

**search_for_files (Content Search):**
```typescript
{
    name: 'search_for_files',
    description: 'Returns file names whose content matches query',
    params: {
        query: string,           // search term
        is_regex: boolean,      // regex mode
        search_in_folder: URI,  // scope restriction
        page_number: number     // pagination
    }
}
```

**search_pathnames_only (Filename Search):**
```typescript
{
    name: 'search_pathnames_only',
    description: 'Returns pathnames matching query (filename only)',
    params: {
        query: string,
        include_pattern: string
    }
}
```

**search_in_file (Line-level Search):**
```typescript
{
    name: 'search_in_file',
    description: 'Returns line numbers where content appears',
    params: {
        uri: URI,
        query: string,
        is_regex: boolean
    }
}
```

### 7.2 NO Internet Search Integration

The system does not have built-in web search capabilities. All context comes from:
1. Local codebase
2. User-provided selections
3. Tool-discovered files

---

## 8. 🛠️ Tool / Function Calling System

### 8.1 Tool Registry Architecture

**Tool Definition Schema (XML-based):**
```typescript
export type InternalToolInfo = {
    name: string,
    description: string,
    params: {
        [paramName: string]: { description: string }
    },
    mcpServerName?: string  // for MCP tools
}
```

**Tool Categories:**

| Category | Tools | Approval Required |
|----------|-------|-------------------|
| Context | read_file, ls_dir, get_dir_tree, search_* | No |
| File Edit | edit_file, rewrite_file, create_file, delete_file | Yes (edits) |
| Terminal | run_command, run_persistent_command, open_persistent_terminal | Yes (terminal) |
| MCP | Custom tools from MCP servers | Yes (MCP tools) |

### 8.2 Tool Selection by LLM

**XML-based Tool Calling:**
```typescript
const systemToolsXMLPrompt = (chatMode, mcpTools) => {
    return `
    Available tools:
    
    1. read_file
       Description: Returns full contents of a given file.
       Format:
       <read_file>
       <uri>file path</uri>
       <start_line>Optional</start_line>
       <end_line>Optional</end_line>
       </read_file>
    
    2. edit_file
       Description: Edit file using SEARCH/REPLACE blocks
       Format:
       <edit_file>
       <uri>file path</uri>
       <search_replace_blocks>blocks</search_replace_blocks>
       </edit_file>
       
    Tool calling details:
    - Only ONE tool call allowed per response
    - Tool call must be at the END of response
    - Results appear in following user message
    `
}
```

### 8.3 Tool Execution Pipeline

**Execution Flow:**
```typescript
async _runToolCall(threadId, toolName, toolId, mcpServerName, params) {
    // 1. Validate params
    const validatedParams = await this._validateToolCall(toolName, params)
    
    // 2. Check approval requirements
    const approvalType = approvalTypeOfBuiltinToolName[toolName]
    const isAutoApproved = this._autoApprove(approvalType, toolCall)
    
    if (!isAutoApproved) {
        // Show approval UI, wait for user
        const approved = await this._requestApproval(...)
        if (!approved) return { interrupted: true }
    }
    
    // 3. Execute tool
    const result = await this._toolsService.runBuiltinTool(toolName, validatedParams)
    
    // 4. Add result to thread
    this._addMessageToThread(threadId, {
        role: 'tool',
        name: toolName,
        params: validatedParams,
        result: result,
        id: toolId
    })
    
    return { interrupted: false }
}
```

### 8.4 File Edit System (SEARCH/REPLACE)

**Search/Replace Block Format:**
```
<<<<<<< ORIGINAL
// ... original code
=======
// ... new code
>>>>>>> UPDATED
```

**Multi-block Support:**
```typescript
const searchReplaceBlockTemplate = `
${ORIGINAL}
// ... original code
${DIVIDER}
// ... final code
${FINAL}

${ORIGINAL}
// ... original code
${DIVIDER}
// ... final code
${FINAL}
`
```

**Validation Rules:**
1. ORIGINAL must match exactly (whitespace, comments)
2. Multiple blocks must be DISJOINT (non-overlapping)
3. Each ORIGINAL must uniquely identify the location

### 8.5 Terminal Execution System

**Terminal Tools:**
```typescript
{
    run_command: {
        params: {
            command: string,
            cwd: string | null,
            terminalId: string
        }
    },
    open_persistent_terminal: {
        params: { cwd: string | null },
        result: { persistentTerminalId: string }
    },
    run_persistent_command: {
        params: {
            command: string,
            persistentTerminalId: string
        }
    }
}
```

**Execution Constraints:**
- Timeout: 8 seconds for regular commands
- Background timeout: 5 seconds for persistent commands
- Output limit: 100,000 characters
- Terminal reuse via terminalId

---

## 9. 🔁 Agent Loop (Core Intelligence Loop)

### 9.1 Complete Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AGENT LOOP                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. USER INPUT                                                          │
│     - User message stored in thread.messages                            │
│     - Optional: Pre-approved tool to execute first                     │
│                                                                         │
│  2. CONTEXT BUILDING                                                    │
│     - Collect workspace state                                          │
│     - Gather @mentioned selections                                     │
│     - Build system message with tool definitions                       │
│     - Compile message history + tool results                           │
│                                                                         │
│  3. LLM CALL                                                            │
│     - Send messages to selected provider                               │
│     - Stream response to UI                                            │
│     - Detect tool call in streaming content                            │
│                                                                         │
│  4. TOOL CALL DETECTION                                                 │
│     - Parse XML tool tags from response                                │
│     - Extract tool name and parameters                                 │
│                                                                         │
│  5. APPROVAL CHECK                                                      │
│     - Check if tool type requires approval                             │
│     - 'edits' | 'terminal' | 'MCP tools'                               │
│     - Auto-approve if user previously approved category                │
│                                                                         │
│  6. TOOL EXECUTION                                                      │
│     - Validate parameters                                              │
│     - Execute via ToolsService                                         │
│     - Capture result or error                                          │
│                                                                         │
│  7. OBSERVATION                                                         │
│     - Add tool result to message history                               │
│     - Set shouldSendAnotherMessage = true                              │
│     - Loop back to step 2                                              │
│                                                                         │
│  8. TERMINATION (when no tool call)                                     │
│     - Add assistant response to history                                │
│     - Break loop                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 State Machine

**IsRunning State:**
```typescript
type IsRunningType = 
    | undefined      // Not running
    | 'idle'         // Waiting for user input/tool approval
    | 'LLM'          // LLM generating
    | 'tool'         // Tool executing
```

**Interrupt System:**
```typescript
// Idle interrupt - cancel before LLM call
const idleInterruptor = () => {
    interruptedWhenIdle = true
}

// LLM interrupt - cancel streaming
interrupt: Promise.resolve(() => this._llmMessageService.abort(llmCancelToken))
```

---

## 10. 🧾 Prompt Engineering System

### 10.1 System Message Construction

**Dynamic Component Assembly:**
```typescript
const ansStrs: string[] = []
ansStrs.push(header)
ansStrs.push(sysInfo)
if (toolDefinitions) ansStrs.push(toolDefinitions)
ansStrs.push(importantDetails)
ansStrs.push(fsInfo)

const fullSystemMsgStr = ansStrs
    .join('\n\n\n')
    .trim()
    .replace('\t', '  ')
```

### 10.2 Mode-Specific Instructions

**Agent Mode Instructions:**
```
ALWAYS use tools (edit, terminal, etc) to take actions and implement changes.
Prioritize taking as many steps as you need to complete your request over stopping early.
You will OFTEN need to gather context before making a change.
ALWAYS have maximal certainty in a change BEFORE you make it.
NEVER modify a file outside the user's workspace without permission.
```

**Gather Mode Instructions:**
```
You are in Gather mode, so you MUST use tools to gather information, files, and context.
You should extensively read files, types, content, etc, gathering full context to solve the problem.
```

### 10.3 Tool Instructions

**Tool Calling Guidelines:**
```
- To call a tool, write its name and parameters in XML format
- After writing tool call, you must STOP and WAIT
- All parameters are REQUIRED unless noted otherwise
- Only ONE tool call allowed per response
- Tool call must be at the END of response
- Tool will be executed immediately, results appear in next user message
```

### 10.4 Formatting Instructions

**Code Block Format:**
```
If you write code blocks, use:
- Include language if possible
- First line must be FULL PATH of related file
- Remaining contents proceed as usual
```

---

## 11. 💾 Memory System

### 11.1 Session Persistence

**Thread Storage:**
- All messages stored in `ChatThreadService.state.allThreads[threadId]`
- Persistent across session via VS Code storage API
- Export/import functionality for chat history

**Checkpoint System:**
```typescript
interface CheckpointEntry {
    role: 'checkpoint'
    children: ChatMessage[]  // Messages since checkpoint
    isError: boolean
}
```

### 11.2 NO Long-Term Memory

The system does NOT have:
- Cross-session learning
- User preference learning
- Codebase embedding storage
- Summarization of past conversations

---

## 12. ⚙️ Execution Sandbox

### 12.1 Terminal Architecture

**TerminalToolService:**
```typescript
class TerminalToolService {
    async runCommand(command: string, cwd: string | null): Promise<TerminalOutput>
    async openPersistentTerminal(cwd: string | null): Promise<string>
    async runPersistentCommand(command: string, persistentTerminalId: string): Promise<TerminalOutput>
}
```

**Execution Flow:**
1. Get or create terminal via VS Code API
2. Send command to terminal
3. Capture output via onData listener
4. Timeout after 8s (or custom limit)
5. Return captured output

### 12.2 Security Constraints

**Built-in Limitations:**
- No sandboxing - runs in user's real environment
- User approval required for edits and terminal commands
- Workspace-only file access enforced (unless user approves)
- No automatic deletion without explicit confirmation

### 12.3 Async Execution

**Persistent Terminals:**
```typescript
open_persistent_terminal: {
    description: 'Opens terminal for long-running commands (dev servers, etc.)'
    // Terminal continues running in background
    // User can interact with it directly
}
```

---

## 13. 🏗️ MCP (Model Context Protocol) Integration

### 13.1 MCP Service Architecture

**MCP Server Management:**
```typescript
interface MCPServer {
    name: string
    command: string
    args: string[]
    env: Record<string, string>
}
```

**Tool Discovery:**
```typescript
class MCPService {
    async refreshTools(): Promise<void>
    getMCPTools(): InternalToolInfo[]
    async callTool(serverName: string, toolName: string, params: any): Promise<any>
}
```

### 13.2 MCP Tool Integration

MCP tools are injected into the LLM's tool definitions:
```typescript
const tools = [
    ...effectiveBuiltinTools ?? [],
    ...effectiveMCPTools ?? [],  // MCP tools here
]
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `chatThreadService.ts` | Agent loop, thread management |
| `convertToLLMMessagesService.ts` | Context building, message preparation |
| `toolsService.ts` | Tool execution, validation |
| `terminalToolService.ts` | Terminal command execution |
| `sendLLMMessageService.ts` | LLM communication layer |
| `sendLLMMessage.impl.ts` | Provider implementations |
| `prompts.ts` | System messages, tool definitions |
| `toolsServiceTypes.ts` | Tool type definitions |
| `mcpService.ts` | MCP server integration |

---

## Architecture Decisions

1. **No Embeddings/RAG**: Uses search-based retrieval for simplicity
2. **XML Tool Calling**: Human-readable, easy to debug
3. **One Tool At A Time**: Forces sequential reasoning, easier to follow
4. **File-Level Context**: Better coherence than chunk-level
5. **IPC Architecture**: Isolates LLM calls from UI thread
6. **Streaming-First**: Real-time feedback for user experience
7. **Approval Gating**: Security through user consent

---

*Generated from deep codebase analysis of Beam (Void) agentic AI system*
