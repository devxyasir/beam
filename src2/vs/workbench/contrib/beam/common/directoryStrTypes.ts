import { URI } from '../../../../base/common/uri.js';

export type BeamDirectoryItem = {
	uri: URI;
	name: string;
	isSymbolicLink: boolean;
	children: BeamDirectoryItem[] | null;
	isDirectory: boolean;
	isGitIgnoredDirectory: false | { numChildren: number }; // if directory is gitignored, we ignore children
}
