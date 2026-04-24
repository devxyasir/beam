
# Beam Agentic AI System - Complete Flowchart

## Full System Architecture (Mermaid)

```mermaid
flowchart TB
    subgraph USER_LAYER["👤 User Layer"]
        UI["React UI<br/>SidebarChat.tsx"]
        INPUT["User Input<br/>Message + @mentions"]
        APPROVAL["Approval UI<br/>Tool Confirmation"]
    end

    subgraph STATE_LAYER["💾 State Management"]
        THREAD_STATE["ChatThreadState<br/>messages[], checkpoints"]
        SETTINGS["SettingsState<br/>modelSelection, chatMode"]
        STREAM_STATE["StreamState<br/>isRunning, llmInfo"]
    end

    subgraph AGENT_CORE["🧠 Agent Core (chatThreadService.ts)"]
        START["startNewThread()<br/>continueChatThread()"]
        AGENT_LOOP["Agent Loop<br/>while (shouldSendAnotherMessage)"]
        LOOP_CTRL["Loop Controller"]

        subgraph LOOP_ITERATION["Single Iteration"]
            BUILD_CTX["Build Context"]
            CALL_LLM["Call LLM<br/>sendLLMMessage()"]
            DETECT_TOOL["Detect Tool Call?<br/>parse XML tags"]
            CHECK_APPROVAL["Approval Required?"]
            EXEC_TOOL["Execute Tool<br/>_runToolCall()"]
            APPEND_RESULT["Append Result<br/>to messages[]"]
            SET_CONTINUE["shouldSendAnotherMessage = true"]
            FINAL_RESP["Final Response<br/>Add to history"]
        end
    end

    subgraph CONTEXT_BUILDER["🧩 Context Builder (convertToLLMMessageService)"]
        SYS_MSG["chat_systemMessage()"]

        subgraph SYS_COMPONENTS["System Message Components"]
            HEADER["Header<br/>Role definition"]
            SYS_INFO["System Info<br/>OS, workspace, active file"]
            DIR_STR["Directory Structure<br/>tree view"]
            TOOL_DEFS["Tool Definitions<br/>XML schemas"]
            DETAILS["Important Details<br/>Instructions"]
        end

        USER_SEL["User Selections<br/>@mentions processing"]
        MSG_HISTORY["Message History<br/>previous messages + tool results"]
    end

    subgraph LLM_LAYER["🤖 LLM Layer (sendLLMMessage)"]
        IPC_SEND["IPC Send<br/>mainProcessService"]

        subgraph PROVIDER_ROUTING["Provider Routing"]
            OPENAI["OpenAI<br/>GPT-4/4o"]
            ANTHROPIC["Anthropic<br/>Claude 3.5"]
            GOOGLE["Google<br/>Gemini"]
            OLLAMA["Ollama<br/>Local Models"]
            OPENROUTER["OpenRouter<br/>Unified API"]
        end

        STREAM["Streaming Response<br/>onText callback"]
        PARSE_TOOL["Parse Tool Call<br/>from streaming content"]
        FINAL_MSG["Final Message<br/>onFinalMessage"]
    end

    subgraph TOOL_REGISTRY["🛠️ Tool Registry (toolsService)"]
        BUILTIN["Built-in Tools"]
        MCP["MCP Tools<br/>External Servers"]

        subgraph BUILTIN_TOOLS["Built-in Categories"]
            READ["read_file<br/>ls_dir<br/>get_dir_tree"]
            SEARCH["search_for_files<br/>search_pathnames_only<br/>search_in_file"]
            EDIT["edit_file<br/>rewrite_file<br/>create_file<br/>delete_file"]
            TERM["run_command<br/>open_persistent_terminal<br/>run_persistent_command"]
        end
    end

    subgraph TOOL_EXECUTION["⚙️ Tool Execution"]
        VALIDATE["Validate Params<br/>Type checking"]
        CHECK_APPROVAL["Check Approval<br/>edits/terminal/MCP?"]
        USER_CONFIRM["User Confirmation<br/>UI prompt"]
        EXEC["Execute Tool"]
        CAPTURE["Capture Result"]
        ADD_TO_THREAD["_addMessageToThread()<br/>role: 'tool'"]
    end

    subgraph TERMINAL_SYSTEM["🔲 Terminal System (terminalToolService)"]
        GET_TERM["Get/Create Terminal"]
        SEND_CMD["Send Command"]
        LISTEN_OUT["Listen onData"]
        TIMEOUT["Timeout Monitor<br/>8s default"]
        RET_OUT["Return Output"]
        PERSISTENT["Persistent Terminal<br/>Background process"]
    end

    subgraph EDIT_SYSTEM["✏️ Edit System (editCodeService)"]
        PARSE_BLOCKS["Parse SEARCH/REPLACE<br/>Blocks"]
        VALIDATE_ORIG["Validate ORIGINAL<br/>Exact match check"]
        APPLY_DIFF["Apply Diff<br/>Text replacement"]
        CHECK_LINT["Check Lint<br/>Report errors"]
    end

    %% Flow connections
    INPUT --> UI
    UI --> START
    START --> THREAD_STATE

    AGENT_LOOP --> LOOP_CTRL
    LOOP_CTRL --> BUILD_CTX

    BUILD_CTX --> SYS_MSG
    SYS_MSG --> HEADER
    SYS_MSG --> SYS_INFO
    SYS_MSG --> DIR_STR
    SYS_MSG --> TOOL_DEFS
    SYS_MSG --> DETAILS

    HEADER --> MSG_HISTORY
    SYS_INFO --> MSG_HISTORY
    DIR_STR --> MSG_HISTORY
    TOOL_DEFS --> MSG_HISTORY
    DETAILS --> MSG_HISTORY

    USER_SEL --> MSG_HISTORY
    SETTINGS -.-> SYS_MSG

    MSG_HISTORY --> CALL_LLM
    CALL_LLM --> IPC_SEND

    IPC_SEND --> PROVIDER_ROUTING
    PROVIDER_ROUTING --> STREAM
    STREAM --> STREAM_STATE
    STREAM --> PARSE_TOOL
    PARSE_TOOL --> FINAL_MSG

    FINAL_MSG --> DETECT_TOOL
    DETECT_TOOL -->|Yes| CHECK_APPROVAL
    DETECT_TOOL -->|No| FINAL_RESP

    CHECK_APPROVAL -->|Required| APPROVAL
    APPROVAL -->|Approved| EXEC_TOOL
    APPROVAL -->|Denied| SET_CONTINUE
    CHECK_APPROVAL -->|Auto-approved| EXEC_TOOL

    EXEC_TOOL --> TOOL_REGISTRY
    TOOL_REGISTRY --> BUILTIN
    TOOL_REGISTRY --> MCP

    BUILTIN --> BUILTIN_TOOLS
    BUILTIN_TOOLS --> READ
    BUILTIN_TOOLS --> SEARCH
    BUILTIN_TOOLS --> EDIT
    BUILTIN_TOOLS --> TERM

    EXEC_TOOL --> VALIDATE
    VALIDATE --> CHECK_APPROVAL
    CHECK_APPROVAL -->|Need confirm| USER_CONFIRM
    USER_CONFIRM --> EXEC
    CHECK_APPROVAL -->|Pre-approved| EXEC

    EXEC --> CAPTURE

    TERM -.-> TERMINAL_SYSTEM
    EDIT -.-> EDIT_SYSTEM

    TERMINAL_SYSTEM --> GET_TERM
    GET_TERM --> SEND_CMD
    SEND_CMD --> LISTEN_OUT
    LISTEN_OUT --> TIMEOUT
    TIMEOUT --> RET_OUT
    GET_TERM -.-> PERSISTENT

    EDIT_SYSTEM --> PARSE_BLOCKS
    PARSE_BLOCKS --> VALIDATE_ORIG
    VALIDATE_ORIG --> APPLY_DIFF
    APPLY_DIFF --> CHECK_LINT
    CHECK_LINT --> CAPTURE

    CAPTURE --> ADD_TO_THREAD
    ADD_TO_THREAD --> THREAD_STATE
    ADD_TO_THREAD --> SET_CONTINUE
    SET_CONTINUE --> AGENT_LOOP

    FINAL_RESP --> THREAD_STATE
    FINAL_RESP --> UI

    %% Styling
    classDef userLayer fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef stateLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef agentCore fill:#f3e5f5,stroke:#6a1b9a,stroke-width:3px
    classDef contextBuilder fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef llmLayer fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef toolRegistry fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    classDef toolExec fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef terminal fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef edit fill:#e8eaf6,stroke:#283593,stroke-width:2px

    class UI,INPUT,APPROVAL userLayer
    class THREAD_STATE,SETTINGS,STREAM_STATE stateLayer
    class START,AGENT_LOOP,LOOP_CTRL,BUILD_CTX,CALL_LLM,DETECT_TOOL,SET_CONTINUE,FINAL_RESP agentCore
    class SYS_MSG,HEADER,SYS_INFO,DIR_STR,TOOL_DEFS,DETAILS,USER_SEL,MSG_HISTORY contextBuilder
    class IPC_SEND,OPENAI,ANTHROPIC,GOOGLE,OLLAMA,OPENROUTER,STREAM,PARSE_TOOL,FINAL_MSG llmLayer
    class TOOL_REGISTRY,BUILTIN,MCP,BUILTIN_TOOLS,READ,SEARCH,EDIT,TERM toolRegistry
    class VALIDATE,CHECK_APPROVAL,USER_CONFIRM,EXEC,CAPTURE,ADD_TO_THREAD toolExec
    class GET_TERM,SEND_CMD,LISTEN_OUT,TIMEOUT,RET_OUT,PERSISTENT terminal
    class PARSE_BLOCKS,VALIDATE_ORIG,APPLY_DIFF,CHECK_LINT edit
```

## Detailed Agent Loop Flowchart

```mermaid
flowchart LR
    subgraph LOOP_START["Initialize"]
        INIT["nMessagesSent = 0<br/>shouldSendAnotherMessage = true<br/>isRunningWhenEnd = undefined"]
        PRE_TOOL["if (callThisToolFirst)<br/>execute pre-approved tool"]
    end

    subgraph MAIN_LOOP["Main Agent Loop"]
        CHECK_LOOP{"shouldSendAnotherMessage?"}
        RESET_FLAGS["shouldSendAnotherMessage = false<br/>isRunningWhenEnd = undefined<br/>nMessagesSent++"]

        subgraph PREPARE["Prepare Context"]
            GET_MSGS["chatMessages =<br/>allThreads[threadId].messages"]
            PREPARE_LLM["prepareLLMChatMessages<br/>system message + history"]
            CHECK_INT1{"interruptedWhenIdle?"}
        end

        subgraph LLM_RETRY["LLM Retry Loop"]
            SET_RETRY["shouldRetryLLM = true<br/>nAttempts = 0"]
            CHECK_RETRY{"shouldRetryLLM?"}
            INC_ATTEMPT["shouldRetryLLM = false<br/>nAttempts++"]

            subgraph LLM_CALL["LLM Call"]
                CREATE_PROMISE["Create promise<br/>for async completion"]
                SEND_MSG["sendLLMMessage<br/>with callbacks"]
                STREAM_CB["onText callback<br/>update streamState"]
                FINAL_CB["onFinalMessage<br/>resolve promise"]
                ERROR_CB["onError callback<br/>resolve with error"]
                ABORT_CB["onAbort callback<br/>resolve with abort"]
            end

            AWAIT_RES["await messageIsDonePromise"]
            CHECK_RUNNING{"isRunning === 'LLM'?"}

            subgraph HANDLE_RESULT["Handle LLM Result"]
                RES_TYPE{"Result Type"}

                HANDLE_ABORT["type: llmAborted<br/>setStreamState(undefined)<br/>return"]

                HANDLE_ERROR["type: llmError"]
                CHECK_RETRY_CNT{"nAttempts < CHAT_RETRIES?"]
                DO_RETRY["shouldRetryLLM = true<br/>await timeout(RETRY_DELAY)<br/>CHECK interruptedWhenIdle"]
                MAX_RETRY_ERR["Add partial response<br/>to history<br/>break"]

                HANDLE_SUCCESS["type: llmDone"]
                EXTRACT_TOOL["Extract toolCall<br/>from response"]
            end
        end

        CHECK_TOOL{"toolCall exists?"}

        subgraph EXECUTE_TOOL["Execute Tool"]
            RUN_TOOL["_runToolCall<br/>name, id, params"]
            CHECK_INT2{"interrupted?"}
            ADD_RESULT["Add tool result<br/>to messages[]"]
            SET_LOOP_CONTINUE["shouldSendAnotherMessage = true"]
        end

        NO_TOOL["No tool call<br/>Add assistant response<br/>to history"]
    end

    %% Connections
    INIT --> PRE_TOOL
    PRE_TOOL --> CHECK_LOOP

    CHECK_LOOP -->|Yes| RESET_FLAGS
    CHECK_LOOP -->|No| END["End Loop"]

    RESET_FLAGS --> GET_MSGS
    GET_MSGS --> PREPARE_LLM
    PREPARE_LLM --> CHECK_INT1

    CHECK_INT1 -->|Yes| END_EARLY["setStreamState(undefined)<br/>return"]
    CHECK_INT1 -->|No| SET_RETRY

    SET_RETRY --> CHECK_RETRY
    CHECK_RETRY -->|Yes| INC_ATTEMPT
    CHECK_RETRY -->|No| CHECK_TOOL

    INC_ATTEMPT --> CREATE_PROMISE
    CREATE_PROMISE --> SEND_MSG

    SEND_MSG --> STREAM_CB
    SEND_MSG --> FINAL_CB
    SEND_MSG --> ERROR_CB
    SEND_MSG --> ABORT_CB

    STREAM_CB --> STREAM_STATE
    STREAM_STATE -.-> UI_UPDATE["UI updates<br/>displayContentSoFar"]

    FINAL_CB --> AWAIT_RES
    ERROR_CB --> AWAIT_RES
    ABORT_CB --> AWAIT_RES

    AWAIT_RES --> CHECK_RUNNING
    CHECK_RUNNING -->|No| END_EARLY2["return"]
    CHECK_RUNNING -->|Yes| RES_TYPE

    RES_TYPE -->|llmAborted| HANDLE_ABORT
    RES_TYPE -->|llmError| HANDLE_ERROR
    RES_TYPE -->|llmDone| HANDLE_SUCCESS

    HANDLE_ABORT --> END

    HANDLE_ERROR --> CHECK_RETRY_CNT
    CHECK_RETRY_CNT -->|Yes| DO_RETRY
    CHECK_RETRY_CNT -->|No| MAX_RETRY_ERR
    MAX_RETRY_ERR --> ADD_ERR_MSG["_addMessageToThread<br/>assistant + interrupted_tool"]
    ADD_ERR_MSG --> CHECK_TOOL

    DO_RETRY --> CHECK_INT_RETRY{"interruptedWhenIdle?"}
    CHECK_INT_RETRY -->|Yes| END_EARLY
    CHECK_INT_RETRY -->|No| CHECK_RETRY

    HANDLE_SUCCESS --> EXTRACT_TOOL
    EXTRACT_TOOL --> CHECK_TOOL

    CHECK_TOOL -->|Yes| RUN_TOOL
    CHECK_TOOL -->|No| NO_TOOL

    RUN_TOOL --> CHECK_INT2
    CHECK_INT2 -->|Yes| INT_HANDLER["setStreamState(undefined)<br/>_addUserCheckpoint()"]
    CHECK_INT2 -->|No| ADD_RESULT

    INT_HANDLER --> CHECK_LOOP
    ADD_RESULT --> SET_LOOP_CONTINUE
    SET_LOOP_CONTINUE --> CHECK_LOOP

    NO_TOOL --> CHECK_LOOP

    %% Styling
    classDef start fill:#e1f5fe,stroke:#01579b
    classDef decision fill:#fff3e0,stroke:#e65100,shape:diamond
    classDef action fill:#f3e5f5,stroke:#6a1b9a
    classDef end fill:#ffebee,stroke:#b71c1c

    class INIT,PRE_TOOL start
    class CHECK_LOOP,CHECK_INT1,CHECK_RETRY,CHECK_RUNNING,RES_TYPE,CHECK_RETRY_CNT,CHECK_TOOL,CHECK_INT2,CHECK_INT_RETRY decision
    class RESET_FLAGS,GET_MSGS,PREPARE_LLM,SET_RETRY,INC_ATTEMPT,CREATE_PROMISE,SEND_MSG,AWAIT_RES,EXTRACT_TOOL,RUN_TOOL,ADD_RESULT,SET_LOOP_CONTINUE,NO_TOOL,ADD_ERR_MSG action
    class END,END_EARLY,END_EARLY2,INT_HANDLER end
```

## Context Building Flowchart

```mermaid
flowchart TB
    subgraph INPUTS["Context Inputs"]
        WS["Workspace Folders"]
        ACTIVE["Active File"]
        OPENED["Opened Files"]
        OS_INFO["OS Info"]
        DIR_TREE["Directory Tree<br/>20k char limit"]
        SELECTIONS["User Selections<br/>@mentions"]
        MODE["Chat Mode<br/>normal/gather/agent"]
    end

    subgraph BUILDER["Context Builder"]
        START_CTX["prepareLLMChatMessages()"]

        subgraph SYS_BUILD["Build System Message"]
            CHAT_SYS["chat_systemMessage()"]

            PART1["Header<br/>Role + Mode description"]
            PART2["System Info<br/>OS + Folders + Files"]
            PART3["File Overview<br/>Directory structure"]
            PART4["Tool Definitions<br/>XML format"]
            PART5["Important Details<br/>Instructions"]

            JOIN["Join with \\n\\n\\n"]
        end

        PROC_SEL["Process Selections<br/>messageOfSelection()"]

        subgraph SEL_TYPES["Selection Types"]
            CODE_SEL["CodeSelection<br/>Line range + language"]
            FILE_SEL["File<br/>Full content"]
            FOLDER_SEL["Folder<br/>Structure + contents"]
        end

        BUILD_USER["Build User Message<br/>instructions + SELECTIONS"]
        ASSEMBLE["Assemble Message Array<br/>system + user + assistant + tool"]
    end

    subgraph OUTPUT["Output"]
        MESSAGES["messages: ChatMessage[]"]
        SEP_SYS["separateSystemMessage: string<br/>for providers requiring separate"]
    end

    %% Connections
    WS --> CHAT_SYS
    ACTIVE --> PART2
    OPENED --> PART2
    OS_INFO --> PART2
    DIR_TREE --> PART3
    MODE --> PART1

    SELECTIONS --> PROC_SEL
    PROC_SEL --> SEL_TYPES

    PART1 --> JOIN
    PART2 --> JOIN
    PART3 --> JOIN
    PART4 --> JOIN
    PART5 --> JOIN

    JOIN --> ASSEMBLE
    SEL_TYPES --> BUILD_USER
    BUILD_USER --> ASSEMBLE

    ASSEMBLE --> MESSAGES
    CHAT_SYS -.-> SEP_SYS

    %% Styling
    classDef inputs fill:#e1f5fe,stroke:#01579b
    classDef builder fill:#f3e5f5,stroke:#6a1b9a
    classDef parts fill:#e8f5e9,stroke:#2e7d32
    classDef output fill:#fff3e0,stroke:#e65100

    class WS,ACTIVE,OPENED,OS_INFO,DIR_TREE,SELECTIONS,MODE inputs
    class START_CTX,CHAT_SYS,PROC_SEL,BUILD_USER,ASSEMBLE,SEL_TYPES builder
    class PART1,PART2,PART3,PART4,PART5,JOIN parts
    class MESSAGES,SEP_SYS output
```

## Tool Execution Flowchart

```mermaid
flowchart LR
    subgraph CALL["Tool Call Detected"]
        PARSE["Parse XML<br/>Extract name, params"]
    end

    subgraph VALIDATE["Validation"]
        CHECK_NAME{"Valid tool<br/>name?"}
        VALIDATE_PARAMS["Validate Params<br/>Zod/schema check"]
        CHECK_TYPES{"Types valid?"}
    end

    subgraph APPROVAL["Approval Flow"]
        GET_TYPE["Get Approval Type<br/>edits/terminal/MCP/none"]
        CHECK_AUTO{"Auto-approved?"}
        SHOW_UI["Show Approval UI<br/>Button highlight"]
        WAIT_USER["Wait for user<br/>Approve/Reject"]
        CHECK_DECISION{"Approved?"}
    end

    subgraph EXEC["Execution"]
        ROUTE{"Tool Type"}

        subgraph BUILTIN["Built-in Tools"]
            READ["read_file<br/>ls_dir<br/>search_*"]
            EDIT["edit_file<br/>rewrite_file<br/>create/delete"]
            TERM["run_command<br/>persistent_terminal"]
        end

        subgraph MCP["MCP Tools"]
            MCP_CALL["MCPService.callTool<br/>serverName, toolName"]
        end
    end

    subgraph RESULT["Result Handling"]
        SUCCESS["Success"]
        ERROR["Error"]
        ADD_MSG["_addMessageToThread<br/>role: 'tool'"]
        LOOP_BACK["Continue Loop<br/>shouldSendAnotherMessage = true"]
    end

    %% Connections
    PARSE --> CHECK_NAME

    CHECK_NAME -->|No| ERR_NAME["Error: Invalid tool"]
    CHECK_NAME -->|Yes| VALIDATE_PARAMS

    VALIDATE_PARAMS --> CHECK_TYPES
    CHECK_TYPES -->|No| ERR_TYPE["Error: Invalid params"]
    CHECK_TYPES -->|Yes| GET_TYPE

    GET_TYPE --> CHECK_AUTO
    CHECK_AUTO -->|Yes| ROUTE
    CHECK_AUTO -->|No| SHOW_UI

    SHOW_UI --> WAIT_USER
    WAIT_USER --> CHECK_DECISION
    CHECK_DECISION -->|No| REJECT["Interrupted<br/>Add checkpoint"]
    CHECK_DECISION -->|Yes| ROUTE

    ROUTE -->|Context| READ
    ROUTE -->|Edit| EDIT
    ROUTE -->|Terminal| TERM
    ROUTE -->|MCP| MCP_CALL

    READ --> SUCCESS
    EDIT --> SUCCESS
    TERM --> SUCCESS
    MCP_CALL --> SUCCESS

    READ -.->|File not found| ERROR
    EDIT -.->|Parse error| ERROR
    TERM -.->|Timeout| ERROR

    SUCCESS --> ADD_MSG
    ERROR --> ADD_MSG

    ERR_NAME --> LOOP_END["End loop<br/>Show error"]
    ERR_TYPE --> LOOP_END
    REJECT --> LOOP_END

    ADD_MSG --> LOOP_BACK

    %% Styling
    classDef call fill:#e1f5fe,stroke:#01579b
    classDef validate fill:#fff3e0,stroke:#e65100
    classDef approval fill:#fce4ec,stroke:#c2185b
    classDef exec fill:#f3e5f5,stroke:#6a1b9a
    classDef result fill:#e8f5e9,stroke:#2e7d32
    classDef error fill:#ffebee,stroke:#b71c1c

    class PARSE call
    class CHECK_NAME,CHECK_TYPES,CHECK_AUTO,CHECK_DECISION,ROUTE validate
    class GET_TYPE,CHECK_AUTO,SHOW_UI,WAIT_USER approval
    class READ,EDIT,TERM,MCP_CALL exec
    class SUCCESS,ERROR,ADD_MSG,LOOP_BACK result
    class ERR_NAME,ERR_TYPE,REJECT,LOOP_END error
```

## IPC Communication Flowchart

```mermaid
sequenceDiagram
    participant UI as React UI
    participant CTS as ChatThreadService
    participant LMS as LLMMessageService
    participant IPC as IPC Channel
    participant MAIN as Main Process
    participant LLM as LLM Provider

    UI->>CTS: startNewThread(message)

    rect rgb(243, 229, 245)
        Note over CTS,LMS: Context Building
        CTS->>CTS: prepareLLMChatMessages()
        CTS->>CTS: Build system message
        CTS->>CTS: Process @mentions
    end

    rect rgb(255, 243, 224)
        Note over LMS,IPC: IPC Setup
        CTS->>LMS: sendLLMMessage(params)
        LMS->>LMS: generateUuid() -> requestId
        LMS->>LMS: Store callbacks in hooks
        LMS->>IPC: channel.call('sendLLMMessage', params)
    end

    rect rgb(232, 245, 233)
        Note over IPC,LLM: Main Process Execution
        IPC->>MAIN: Receive message
        MAIN->>MAIN: Route to provider

        loop Streaming
            LLM->>MAIN: Chunk
            MAIN->>IPC: channel.emit('onText_sendLLMMessage', chunk)
        end

        LLM->>MAIN: Final message + tool_call
        MAIN->>IPC: channel.emit('onFinalMessage_sendLLMMessage', result)
    end

    rect rgb(255, 243, 224)
        Note over IPC,LMS: Response Handling
        IPC->>LMS: onText event
        LMS->>LMS: hooks.onText[requestId](chunk)

        IPC->>LMS: onFinalMessage event
        LMS->>LMS: hooks.onFinalMessage[requestId](result)
        LMS->>LMS: _clearChannelHooks(requestId)
    end

    rect rgb(243, 229, 245)
        Note over CTS,UI: Tool Detection
        LMS-->>CTS: Promise resolves
        CTS->>CTS: Detect toolCall in response

        alt Tool Call Detected
            CTS->>CTS: _runToolCall()
            CTS->>UI: Request approval (if needed)
            UI-->>CTS: User approves
            CTS->>CTS: Execute tool
            CTS->>CTS: Add result to messages
            CTS->>CTS: shouldSendAnotherMessage = true
            CTS->>CTS: Loop back
        else No Tool Call
            CTS->>CTS: Add assistant response
            CTS->>UI: Display final response
        end
    end
```

## File Edit System Flowchart

```mermaid
flowchart TB
    subgraph INPUT["Edit Input"]
        BLOCKS["SEARCH/REPLACE Blocks<br/>Multiple allowed"]
        URI["Target File URI"]
    end

    subgraph PARSE["Parse Blocks"]
        SPLIT["Split by ORIGINAL/DIVIDER/FINAL"]
        EXTRACT["Extract pairs<br/>[original, replacement]"]
        COUNT["Count blocks"]
    end

    subgraph VALIDATE["Validate Blocks"]
        LOOP["For each block"]
        CHECK_ORIG["Check ORIGINAL exists<br/>in target file"]
        CHECK_UNIQUE["Verify disjoint<br/>No overlapping regions"]
        CHECK_MULTI{"All valid?"}
    end

    subgraph APPLY["Apply Edits"]
        SORT["Sort by position<br/>Descending (bottom-up)"]
        APPLY_LOOP["For each block"]
        FIND["Find ORIGINAL index"]
        REPLACE["Replace with<br/>FINAL content"]
        UPDATE["Update file content"]
    end

    subgraph VERIFY["Post-Edit"]
        SAVE["Write to file"]
        LINT["Check lint errors"]
        REPORT["Return result<br/>success + errors"]
    end

    %% Connections
    BLOCKS --> SPLIT
    URI --> FIND

    SPLIT --> EXTRACT
    EXTRACT --> COUNT
    COUNT --> LOOP

    LOOP --> CHECK_ORIG
    CHECK_ORIG --> CHECK_UNIQUE
    CHECK_UNIQUE --> CHECK_MULTI

    CHECK_MULTI -->|Yes| SORT
    CHECK_MULTI -->|No| ERR["Throw ValidationError<br/>with details"]

    SORT --> APPLY_LOOP
    APPLY_LOOP --> FIND
    FIND --> REPLACE
    REPLACE --> UPDATE
    UPDATE -->|More blocks| APPLY_LOOP
    UPDATE -->|Done| SAVE

    SAVE --> LINT
    LINT --> REPORT

    %% Styling
    classDef input fill:#e1f5fe,stroke:#01579b
    classDef parse fill:#fff3e0,stroke:#e65100
    classDef validate fill:#ffebee,stroke:#b71c1c
    classDef apply fill:#e8f5e9,stroke:#2e7d32
    classDef verify fill:#f3e5f5,stroke:#6a1b9a

    class BLOCKS,URI input
    class SPLIT,EXTRACT,COUNT,LOOP parse
    class CHECK_ORIG,CHECK_UNIQUE,CHECK_MULTI,ERR validate
    class SORT,APPLY_LOOP,FIND,REPLACE,UPDATE apply
    class SAVE,LINT,REPORT verify
```

## Key State Transitions

```mermaid
stateDiagram-v2
    [*] --> Idle: User starts chat

    Idle --> BuildingContext: Build system message
    BuildingContext --> CallingLLM: Context ready

    CallingLLM --> Streaming: First token received
    Streaming --> CallingLLM: Continue streaming

    CallingLLM --> ExecutingTool: Tool call detected
    CallingLLM --> Complete: No tool call

    ExecutingTool --> RequestingApproval: Needs approval
    RequestingApproval --> ExecutingTool: Approved
    RequestingApproval --> Idle: Rejected

    ExecutingTool --> Idle: Tool result ready
    Idle --> BuildingContext: Continue loop

    Streaming --> Aborted: User aborts
    CallingLLM --> Aborted: User aborts
    ExecutingTool --> Aborted: User aborts

    Complete --> [*]
    Aborted --> [*]

    note right of Idle
        shouldSendAnotherMessage
        determines if loop continues
    end note

    note right of Streaming
        Updates streamState
        with displayContentSoFar
        and reasoningSoFar
    end note
```

---

*Flowcharts represent the complete Beam Agentic AI System architecture*
