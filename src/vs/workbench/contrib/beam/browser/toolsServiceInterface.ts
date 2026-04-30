import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { RawToolParamsObj } from '../common/sendLLMMessageTypes.js';
import { BuiltinToolCallParams, BuiltinToolResultType, BuiltinToolName, BuiltinToolResultToString } from '../common/toolsServiceTypes.js';
export { BuiltinToolResultToString };

export type ValidateBuiltinParams = { [T in BuiltinToolName]: (p: RawToolParamsObj) => BuiltinToolCallParams[T] }
export type CallBuiltinTool = { [T in BuiltinToolName]: (p: BuiltinToolCallParams[T]) => Promise<{ result: BuiltinToolResultType[T] | Promise<BuiltinToolResultType[T]>, interruptTool?: () => void }> }

export interface IToolsService {
	readonly _serviceBrand: undefined;
	validateParams: ValidateBuiltinParams;
	callTool: CallBuiltinTool;
	stringOfResult: BuiltinToolResultToString;
}

export const IToolsService = createDecorator<IToolsService>('ToolsService');
