// Normally you'd want to put these exports in the files that register them, but if you do that you'll get an import order error if you import them in certain cases.
// (importing them runs the whole file to get the ID, causing an import error). I guess it's best practice to separate out IDs, pretty annoying...

export const BEAM_CTRL_L_ACTION_ID = 'beam.ctrlLAction'

export const BEAM_CTRL_K_ACTION_ID = 'beam.ctrlKAction'

export const BEAM_ACCEPT_DIFF_ACTION_ID = 'beam.acceptDiff'

export const BEAM_REJECT_DIFF_ACTION_ID = 'beam.rejectDiff'

export const BEAM_GOTO_NEXT_DIFF_ACTION_ID = 'beam.goToNextDiff'

export const BEAM_GOTO_PREV_DIFF_ACTION_ID = 'beam.goToPrevDiff'

export const BEAM_GOTO_NEXT_URI_ACTION_ID = 'beam.goToNextUri'

export const BEAM_GOTO_PREV_URI_ACTION_ID = 'beam.goToPrevUri'

export const BEAM_ACCEPT_FILE_ACTION_ID = 'beam.acceptFile'

export const BEAM_REJECT_FILE_ACTION_ID = 'beam.rejectFile'

export const BEAM_ACCEPT_ALL_DIFFS_ACTION_ID = 'beam.acceptAllDiffs'

export const BEAM_REJECT_ALL_DIFFS_ACTION_ID = 'beam.rejectAllDiffs'
