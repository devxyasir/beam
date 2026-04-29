import { IToolsService } from './toolsService.js';

// --- Type Abstractions for VSCode Internal Services ---
// (These map to actual VSCode IEditorService capabilities)

export interface ITextModel {
    getValue(): string;
    getLineCount(): number;
}

export interface IActiveEditorControl {
    hasModel(): boolean;
    getModel(): ITextModel | null;
}

export interface IVisibleEditor {
    resource?: { fsPath: string };
}

export interface IEditorService {
    activeTextEditorControl?: IActiveEditorControl;
    visibleEditors: readonly IVisibleEditor[];
}

// --- Context Interfaces ---

export interface AgentContext {
    activeFileContent: string;
    visibleFileSignatures: string[];
    relevantSearchResults: string[];
}

export class AIContextBuilder {
    // strict token optimization caps
    private readonly MAX_CHARS_ACTIVE_FILE = 20000; // ~5k tokens
    private readonly MAX_CHARS_SEARCH = 10000;      // ~2.5k tokens
    private readonly MAX_CHARS_SEARCH_QUERY = 200;

    constructor(
        private editorService: IEditorService,
        private toolsService: IToolsService
    ) {}

    /**
     * Extracts dynamic context directly from the VSCode IDE state without duplication.
     */
    public async buildContext(userRequest: string): Promise<AgentContext> {
        const context: AgentContext = {
            activeFileContent: 'No active editor found.',
            visibleFileSignatures: [],
            relevantSearchResults: []
        };

        // 1. Tier 1: Extract Active Unsaved File State
        const activeEditor = this.editorService.activeTextEditorControl as any;
        if (activeEditor && typeof activeEditor.getModel === 'function') {
            const model = activeEditor.getModel();
            if (model && typeof model.getValue === 'function') {
                const fullText = model.getValue();

                // Token Optimization Strategy: Truncation
                if (fullText.length > this.MAX_CHARS_ACTIVE_FILE) {
                    context.activeFileContent = fullText.substring(0, this.MAX_CHARS_ACTIVE_FILE) + '\n\n...[TRUNCATED TO SAVE TOKENS]';
                } else {
                    context.activeFileContent = fullText;
                }
            }
        }

        // 2. Tier 2: Extract Visible Editor Tabs (Paths only)
        const visibleEditors = this.editorService.visibleEditors;
        context.visibleFileSignatures = visibleEditors
            .map(e => e.resource?.fsPath)
            .filter((path): path is string => !!path); // Filter undefined

        // 3. Tier 3: Contextual Workspace Search
        // We use the existing toolsService to safely grep the workspace for keywords from the user prompt
        try {
            // A simplistic heuristic: use the user's raw prompt as the query for a filename search
            // In a more advanced setup, the AIPlanningSystem would generate the specific query
            const searchQuery = userRequest.trim().replace(/\s+/g, ' ').substring(0, this.MAX_CHARS_SEARCH_QUERY);
            const validatedParams = this.toolsService.validateParams['search_pathnames_only']({
                query: searchQuery || userRequest,
                page_number: '1'
            });

            const { result } = await this.toolsService.callTool['search_pathnames_only'](validatedParams as any);
            const resolvedResult = await result;

            // Format the result using the existing formatting string utility
            const searchResultsStr = this.toolsService.stringOfResult['search_pathnames_only'](validatedParams as any, resolvedResult);

            // Token Optimization Strategy: Aggressive Truncation for search
            context.relevantSearchResults.push(
                searchResultsStr.length > this.MAX_CHARS_SEARCH
                    ? searchResultsStr.substring(0, this.MAX_CHARS_SEARCH) + '\n...[TRUNCATED]'
                    : searchResultsStr
            );
        } catch (e) {
            // Failsafe: if the search errors, we silently drop the Tier 3 context
            // to ensure the agent still runs with Tier 1 and Tier 2.
            const message = e instanceof Error ? e.message : String(e);
            context.relevantSearchResults.push(`Search failed or unavailable: ${message}`);
        }

        return context;
    }

    /**
     * Compiles the extracted context into the final System Prompt prefix for the LLM.
     */
    public formatContextForLLM(context: AgentContext): string {
        return `
# Live VSCode Workspace Context

## Active Editor (Currently focused file)
\`\`\`
${context.activeFileContent}
\`\`\`

## Other Visible Tabs
${context.visibleFileSignatures.length > 0 ? context.visibleFileSignatures.join('\n') : 'None'}

## Relevant Workspace Files (Search Results)
${context.relevantSearchResults.join('\n')}
`;
    }
}
