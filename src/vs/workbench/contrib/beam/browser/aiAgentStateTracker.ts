import { agentEventBus } from './aiAgentEventBus.js';

export type AgentStatus = 'planning' | 'executing' | 'verifying' | 'completed' | 'failed';

export interface TerminalExecutionRecord {
    command: string;
    exitCode: number;
    timestamp: number;
}

export interface AgentExecutionState {
    taskId: string;

    // Step Progress
    totalSteps: number;
    currentStepIndex: number;
    status: AgentStatus;

    // Workspace Pointers (No file contents stored!)
    openedFiles: Set<string>;   // URIs of files the agent has viewed
    modifiedFiles: Set<string>; // URIs of files the agent has edited

    // Tool Histories
    terminalHistory: TerminalExecutionRecord[];
    searchHistory: string[];    // Search queries executed
}

export class AgentStateTracker {
    private state: AgentExecutionState;

    constructor(taskId: string) {
        this.state = this.createInitialState(taskId);
    }

    private createInitialState(taskId: string): AgentExecutionState {
        return {
            taskId,
            totalSteps: 0,
            currentStepIndex: 0,
            status: 'planning',
            openedFiles: new Set(),
            modifiedFiles: new Set(),
            terminalHistory: [],
            searchHistory: []
        };
    }

    private sync() {
        agentEventBus.emit('STATE_SYNC', this.state.taskId, this.getStateSnapshot());
    }

    public reset(taskId: string) {
        this.state = this.createInitialState(taskId);
        this.sync();
    }

    public setTaskId(taskId: string) {
        if (this.state.taskId === taskId) return;
        this.state.taskId = taskId;
    }

    public setPlan(totalSteps: number) {
        this.state.totalSteps = totalSteps;
        this.state.currentStepIndex = 0;
        this.state.status = 'executing';
        this.sync();
    }

    public setProgress(currentStepIndex: number, totalSteps: number = this.state.totalSteps) {
        this.state.totalSteps = totalSteps;
        this.state.currentStepIndex = Math.max(0, Math.min(currentStepIndex, totalSteps));
        this.sync();
    }

    public advanceStep() {
        if (this.state.currentStepIndex < this.state.totalSteps) {
            this.state.currentStepIndex++;
            this.sync();
        }
    }

    public setStatus(status: AgentStatus) {
        this.state.status = status;
        this.sync();
    }

    // --- VSCode Event Integrations ---

    public recordFileOpened(uriStr: string) {
        this.state.openedFiles.add(uriStr);
        this.sync();
    }

    public recordFileModified(uriStr: string) {
        this.state.openedFiles.add(uriStr); // If modified, it must be open
        this.state.modifiedFiles.add(uriStr);
        this.sync();
    }

    public recordTerminalExecution(command: string, exitCode: number) {
        this.state.terminalHistory.push({
            command,
            exitCode,
            timestamp: Date.now()
        });
        this.sync();
    }

    public recordSearch(query: string) {
        this.state.searchHistory.push(query);
        this.sync();
    }

    public getStateSnapshot() {
        return {
            taskId: this.state.taskId,
            totalSteps: this.state.totalSteps,
            currentStepIndex: this.state.currentStepIndex,
            status: this.state.status,
            openedFiles: Array.from(this.state.openedFiles),
            modifiedFiles: Array.from(this.state.modifiedFiles),
            terminalHistory: [...this.state.terminalHistory],
            searchHistory: [...this.state.searchHistory]
        };
    }
}
