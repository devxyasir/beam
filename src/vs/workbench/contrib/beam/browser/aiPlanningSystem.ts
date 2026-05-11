import type { ILLMProvider, LLMMessage } from './selfHealingAgentController.js';

// --- 1. Interface Definitions ---

export type BeamToolAction =
    | 'read_file'
    | 'edit_file'
    | 'rewrite_file'
    | 'run_command'
    | 'run_persistent_command'
    | 'open_persistent_terminal'
    | 'kill_persistent_terminal'
    | 'search_for_files'
    | 'search_pathnames_only'
    | 'search_in_file'
    | 'search_web'
    | 'get_dir_tree'
    | 'ls_dir'
    | 'read_lint_errors'
    | 'create_file_or_folder'
    | 'delete_file_or_folder';

export interface PlanStep {
    action: BeamToolAction;
    target: string;
    description: string;
    reasoning?: string; // Optional reasoning for observability
    expectedToolKinds?: BeamToolAction[];
}

export interface ExecutionPlan {
    steps: PlanStep[];
}

// --- 2. Prompts ---

const PLANNING_SYSTEM_PROMPT = `You are a high-level AI Planning System embedded in a VSCode environment.
You DO NOT execute code or access the filesystem directly.
Your ONLY job is to analyze user requests and decompose them into a sequential execution plan.

CRITICAL CONSTRAINTS:
1. You must output a raw JSON object containing a "steps" array.
2. Every step's "action" must be EXACTLY one of: "read_file", "edit_file", "rewrite_file", "run_command", "run_persistent_command", "open_persistent_terminal", "kill_persistent_terminal", "search_for_files", "search_pathnames_only", "search_in_file", "search_web", "get_dir_tree", "ls_dir", "read_lint_errors", "create_file_or_folder", "delete_file_or_folder".
3. DO NOT invent tools outside this VSCode ecosystem.
4. For any task that may change code, include a final "run_command" verification step when a relevant verification command is available.
5. Every step must include a short human-readable "description" for UI display.
6. When possible, include "expectedToolKinds" as an array of tool actions that would semantically satisfy the step.

Output Format Example:
\`\`\`json
{
  "steps": [
    {
      "action": "search_for_files",
      "target": "auth logic",
      "description": "Find authentication-related files",
      "reasoning": "Find where authentication is handled",
      "expectedToolKinds": ["search_for_files", "search_pathnames_only"]
    },
    {
      "action": "edit_file",
      "target": "auth.ts",
      "description": "Update the auth logic",
      "reasoning": "Update the logic based on search results"
    }
  ]
}
\`\`\`
Return ONLY valid JSON. Do not include conversational filler.`;

// --- 3. Planning System Implementation ---

export class AIPlanningSystem {
    private readonly MAX_PLAN_STEPS = 12;

    constructor(private llmProvider: ILLMProvider) {}

    /**
     * Extracts a JSON block from a raw string, handling markdown code blocks.
     */
    private extractJsonFromMarkdown(text: string): string {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            return jsonMatch[1];
        }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1);
        }
        // Fallback: assume the whole string might be JSON
        return text.trim();
    }

    /**
     * Validates that the parsed JSON strictly matches the ExecutionPlan schema.
     */
    private validateExecutionPlan(parsedJson: any): ExecutionPlan {
        if (!parsedJson || !Array.isArray(parsedJson.steps)) {
            throw new Error(`Invalid Plan: JSON must contain a "steps" array.`);
        }
        if (parsedJson.steps.length === 0) {
            throw new Error(`Invalid Plan: "steps" must contain at least one step.`);
        }
        if (parsedJson.steps.length > this.MAX_PLAN_STEPS) {
            throw new Error(`Invalid Plan: too many steps (${parsedJson.steps.length}). Maximum is ${this.MAX_PLAN_STEPS}.`);
        }

        const validActions: BeamToolAction[] = ['read_file', 'edit_file', 'rewrite_file', 'run_command', 'run_persistent_command', 'open_persistent_terminal', 'kill_persistent_terminal', 'search_for_files', 'search_pathnames_only', 'search_in_file', 'search_web', 'get_dir_tree', 'ls_dir', 'read_lint_errors', 'create_file_or_folder', 'delete_file_or_folder'];
        const steps: PlanStep[] = [];

        for (const [index, step] of parsedJson.steps.entries()) {
            if (!step || typeof step !== 'object') {
                throw new Error(`Invalid Plan at step ${index}: step must be an object.`);
            }
            if (!validActions.includes(step.action)) {
                throw new Error(`Invalid Plan at step ${index}: Action "${step.action}" is not a supported VSCode tool.`);
            }
            if (typeof step.target !== 'string' || step.target.trim() === '') {
                throw new Error(`Invalid Plan at step ${index}: "target" must be a non-empty string.`);
            }
            if (typeof step.description !== 'string' || step.description.trim() === '') {
                throw new Error(`Invalid Plan at step ${index}: "description" must be a non-empty string.`);
            }
            if (step.reasoning !== undefined && typeof step.reasoning !== 'string') {
                throw new Error(`Invalid Plan at step ${index}: "reasoning" must be a string when provided.`);
            }
            const expectedToolKinds = Array.isArray(step.expectedToolKinds)
                ? step.expectedToolKinds.filter((tool: unknown): tool is BeamToolAction => validActions.includes(tool as BeamToolAction))
                : undefined;

            steps.push({
                action: step.action,
                target: step.target.trim(),
                description: step.description.trim(),
                reasoning: typeof step.reasoning === 'string' ? step.reasoning.trim() : undefined,
                expectedToolKinds: expectedToolKinds?.length ? expectedToolKinds : [step.action],
            });
        }

        return { steps };
    }

    /**
     * Takes a user request and generates a validated JSON execution plan.
     */
    public async generatePlan(userRequest: string, workspaceContext: string = '', _taskId: string = 'plan-0'): Promise<ExecutionPlan> {
        const history: LLMMessage[] = [
            { role: 'system', content: PLANNING_SYSTEM_PROMPT },
            { role: 'user', content: `Workspace Context:\n${workspaceContext}\n\nTask: ${userRequest}` }
        ];

        // 1. Generate the plan using the LLM
        const response = await this.llmProvider.generate(history);

        // 2. Extract JSON payload
        const jsonString = this.extractJsonFromMarkdown(response.content);

        // 3. Parse and Validate
        let parsedJson;
        try {
            parsedJson = JSON.parse(jsonString);
        } catch (e) {
            throw new Error(`AI generated malformed JSON: ${response.content}`);
        }

        return this.validateExecutionPlan(parsedJson);
    }
}
