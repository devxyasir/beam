import { IToolsService } from './toolsServiceInterface.js';
import { BuiltinToolName } from '../common/toolsServiceTypes.js';
import { AgentStateTracker } from './aiAgentStateTracker.js';

// --- 1. Interface Definitions ---

export interface AgentToolRequest {
	toolName: BuiltinToolName | string;
	rawJsonParams: string | Record<string, unknown>; // Unparsed JSON directly from the LLM, or native tool params
	/** When provided, skip validateParams — ChatThreadService already validated these. */
	preValidatedParams?: any;
	agentId: string; // For tracking who called it
}

export interface AgentToolResponse {
	success: boolean;
	resultStr: string;
	rawResult?: any;
	interruptTool?: () => void;
	error?: string;
	executionDurationMs: number;
}

export interface ToolPermissions {
	canWriteFiles: boolean;
	canRunTerminals: boolean;
	canDeleteFiles: boolean;
	maxTimeoutMs: number; // For terminal commands
}

// --- 2. Logging System ---
// A simple logging wrapper. In a real VS Code extension, this could route to an OutputChannel.
export class AgentLogger {
	public log(message: string): void {
		console.log(`[Beam Agent] ${message}`);
	}
	public error(message: string, error?: any): void {
		console.error(`[Beam Agent] ${message}`, error);
	}
}

// --- 3. Security Layer (Validation + Permissions) ---

export class ToolSecurityValidator {
	constructor(private permissions: ToolPermissions) { }

	private isDangerousTerminalCommand(command: string): boolean {
		return [
			/\brm\s+[^;&|]*-[^;&|]*r/i,
			/\brmdir\s+\/s\b/i,
			/\brd\s+\/s\b/i,
			/\bdel\s+[^;&|]*\/s\b/i,
			/\bRemove-Item\b[^;&|]*-Recurse\b/i,
			/\bgit\s+reset\s+--hard\b/i,
			/\bgit\s+clean\s+-[^\s;&|]*[fd][^\s;&|]*\b/i,
			/\b(drop\s+database|drop\s+table|truncate\s+table)\b/i,
			/\b(format|shutdown|reboot)\b/i,
		].some(pattern => pattern.test(command));
	}

	public validateAccess(toolName: string, parsedParams: any): void {
		// Terminal Execution Guard
		if ((toolName === 'run_command' || toolName === 'run_persistent_command' || toolName === 'open_persistent_terminal') && !this.permissions.canRunTerminals) {
			throw new Error(`Security Exception: Agent lacks permission to run terminal commands.`);
		}
		if ((toolName === 'run_command' || toolName === 'run_persistent_command') && this.isDangerousTerminalCommand(String(parsedParams.command ?? ''))) {
			throw new Error(`Security Exception: Refusing to run a potentially destructive terminal command without explicit user approval.`);
		}

		// Destructive Operations Guard
		if (toolName === 'delete_file_or_folder' && !this.permissions.canDeleteFiles) {
			throw new Error(`Security Exception: Agent lacks permission to delete files or folders.`);
		}

		// Write Files Guard
		if ((toolName === 'rewrite_file' || toolName === 'edit_file' || toolName === 'create_file_or_folder') && !this.permissions.canWriteFiles) {
			throw new Error(`Security Exception: Agent lacks permission to write or modify files.`);
		}

		// Timeout Enforcement (preventing infinite hanging)
		if (toolName === 'run_command') {
			const requestedTimeout = parsedParams.timeout_ms === undefined ? undefined : Number.parseInt(String(parsedParams.timeout_ms), 10);
			if (requestedTimeout !== undefined && Number.isFinite(requestedTimeout) && requestedTimeout > this.permissions.maxTimeoutMs) {
				parsedParams.timeout_ms = this.permissions.maxTimeoutMs; // Override silently
			}
		}
	}
}

// --- 4. Wrapper Implementation over VSCode APIs ---

export class AIToolExecutionLayer {
	private security: ToolSecurityValidator;
	private logger: AgentLogger;

	constructor(
		private readonly toolsService: IToolsService,
		permissions: ToolPermissions,
		private stateTracker?: AgentStateTracker
	) {
		this.security = new ToolSecurityValidator(permissions);
		this.logger = new AgentLogger();
	}

	public async executeTool(request: AgentToolRequest): Promise<AgentToolResponse> {
		const startTime = Date.now();
		this.stateTracker?.setTaskId(request.agentId);
		this.logger.log(`[AGENT ${request.agentId}] Attempting to execute ${request.toolName}`);

		try {
			// 1. Structured JSON Parsing (Catching LLM hallucinations)
			let parsedParams: any;
			if (typeof request.rawJsonParams === 'string') {
				try {
					parsedParams = JSON.parse(request.rawJsonParams);
				} catch (e) {
					throw new Error(`Invalid JSON parameters provided for ${request.toolName}. You provided: ${request.rawJsonParams}`);
				}
			} else {
				parsedParams = request.rawJsonParams;
			}
			if (!parsedParams || typeof parsedParams !== 'object' || Array.isArray(parsedParams)) {
				throw new Error(`Invalid parameters provided for ${request.toolName}. Expected a JSON object.`);
			}

			// Check if tool exists
			if (!(request.toolName in this.toolsService.validateParams)) {
				throw new Error(`Tool hallucination: Tool '${request.toolName}' does not exist.`);
			}
			const builtinToolName = request.toolName as BuiltinToolName;

			// 3. Tool-Specific Schema Validation
			// Skip if ChatThreadService already validated (avoids double-validation, Issue #5).
			const validatedParams = request.preValidatedParams
				?? (this.toolsService.validateParams[builtinToolName](parsedParams) as any);

			// 2. Permission Validation
			// Validate the same params that will be executed so timeout clamping and
			// terminal/file guards cannot diverge from ChatThreadService validation.
			this.security.validateAccess(request.toolName, validatedParams);

			// 4. Execution via VSCode API
			const { result, interruptTool } = await (this.toolsService.callTool as any)[builtinToolName](validatedParams);

			// Await the result if it's a promise (some tools return promises in the result object)
			const resolvedResult: any = await result;

			// 5. Formatting output
			const resultStr = (this.toolsService.stringOfResult as any)[builtinToolName](validatedParams, resolvedResult);

			// 6. Record State automatically
			if (this.stateTracker) {
				const uriStr = validatedParams?.uri?.toString?.() ?? parsedParams.uri ?? '<unknown-uri>';
				if (builtinToolName === 'read_file') {
					this.stateTracker.recordFileOpened(uriStr);
				} else if (builtinToolName === 'edit_file' || builtinToolName === 'rewrite_file' || builtinToolName === 'create_file_or_folder' || builtinToolName === 'delete_file_or_folder') {
					this.stateTracker.recordFileModified(uriStr);
				} else if (builtinToolName === 'run_command' || builtinToolName === 'run_persistent_command') {
					const exitCode = resolvedResult?.resolveReason?.type === 'done' ? resolvedResult.resolveReason.exitCode : -1;
					this.stateTracker.recordTerminalExecution(String(parsedParams.command ?? ''), exitCode);
				} else if (builtinToolName.startsWith('search_')) {
					this.stateTracker.recordSearch(parsedParams.query || '<query>');
				}
			}

			const duration = Date.now() - startTime;
			this.logger.log(`[AGENT ${request.agentId}] SUCCESS ${request.toolName} in ${duration}ms`);

			return {
				success: true,
				resultStr,
				rawResult: resolvedResult,
				interruptTool,
				executionDurationMs: duration
			};

		} catch (error: any) {
			const duration = Date.now() - startTime;
			this.logger.error(`[AGENT ${request.agentId}] FAILED ${request.toolName}: ${error.message}`);

			return {
				success: false,
				resultStr: `Tool Execution Failed: ${error.message}. Please analyze this error and correct your parameters.`,
				error: error.message,
				executionDurationMs: duration
			};
		}
	}
}
