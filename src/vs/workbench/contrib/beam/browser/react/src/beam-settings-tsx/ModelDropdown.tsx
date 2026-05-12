/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { displayInfoOfProviderName, FeatureName, featureNames, isFeatureNameDisabled, ModelSelection, modelSelectionsEqual, ProviderName, providerNames, SettingsOfProvider } from '../../../../../../../workbench/contrib/beam/common/beamSettingsTypes.js'
import { useSettingsState, useRefreshModelState, useAccessor } from '../util/services.js'
import { BEAM_OPEN_SETTINGS_ACTION_ID, BEAM_TOGGLE_SETTINGS_ACTION_ID } from '../../../beamSettingsPane.js'
import { modelFilterOfFeatureName, ModelOption } from '../../../../../../../workbench/contrib/beam/common/beamSettingsService.js'
import { WarningBox } from './WarningBox.js'
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react'
import { Check, Search } from 'lucide-react'

const optionsEqual = (m1: ModelOption[], m2: ModelOption[]) => {
	if (m1.length !== m2.length) return false
	for (let i = 0; i < m1.length; i++) {
		if (!modelSelectionsEqual(m1[i].selection, m2[i].selection)) return false
	}
	return true
}

const ModelSelectBox = ({ options, featureName, className }: { options: ModelOption[], featureName: FeatureName, className: string }) => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const [isOpen, setIsOpen] = useState(false)
	const [query, setQuery] = useState('')

	const selection = beamSettingsService.state.modelSelectionOfFeature[featureName]
	const selectedOption = selection ? options.find(v => modelSelectionsEqual(v.selection, selection)) ?? options[0] : options[0]

	const { x, y, strategy, refs } = useFloating({
		open: isOpen,
		onOpenChange: setIsOpen,
		placement: 'bottom-start',
		middleware: [
			offset({ mainAxis: 6, crossAxis: -4 }),
			flip({ boundary: document.body, padding: 8 }),
			shift({ boundary: document.body, padding: 8 }),
		],
		whileElementsMounted: autoUpdate,
		strategy: 'fixed',
	})

	const onChangeOption = useCallback((newOption: ModelOption) => {
		beamSettingsService.setModelSelectionOfFeature(featureName, newOption.selection)
	}, [beamSettingsService, featureName])

	const filteredGroups = useMemo(() => {
		const q = query.trim().toLowerCase()
		const groups = new Map<string, ModelOption[]>()

		for (const option of options) {
			const providerTitle = displayInfoOfProviderName(option.selection.providerName).title
			const haystack = `${providerTitle} ${option.selection.providerName} ${option.selection.modelName}`.toLowerCase()
			if (q && !haystack.includes(q)) continue
			const existing = groups.get(providerTitle) ?? []
			existing.push(option)
			groups.set(providerTitle, existing)
		}

		return [...groups.entries()].map(([label, models]) => ({ label, models }))
	}, [options, query])

	useEffect(() => {
		if (!isOpen) return
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node
			const floating = refs.floating.current
			const reference = refs.reference.current
			if (
				floating &&
				reference instanceof HTMLElement &&
				!reference.contains(target) &&
				!floating.contains(target)
			) {
				setIsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [isOpen, refs.floating, refs.reference])

	const badgeOfModel = (option: ModelOption) => {
		const name = option.selection.modelName.toLowerCase()
		const providerName = option.selection.providerName
		if (/gpt-5|glm-5|claude-4|gemini-2\.5|opus/.test(name)) return { label: 'New', className: '@@beam-model-badge-new' }
		if (/flash|mini|haiku|lite|small|turbo|8b|7b|3b/.test(name)) return { label: 'Fast', className: '@@beam-model-badge-fast' }
		if (/pro|sonnet|reason|thinking|large|120b|70b/.test(name)) return { label: 'Pro', className: '@@beam-model-badge-pro' }
		if (providerName === 'ollama' || providerName === 'lmstudio') return { label: 'Local', className: '@@beam-model-badge-slow' }
		return null
	}

	return <div className={`inline-block relative ${className}`}>
		<button
			type='button'
			ref={refs.setReference}
			className='flex h-4 w-full items-center whitespace-nowrap bg-transparent text-beam-fg-3 transition-colors duration-150 hover:text-beam-fg-1'
			onClick={() => setIsOpen(value => !value)}
		>
			<span className='mr-1 truncate'>{selectedOption.selection.modelName}</span>
			<svg className='size-3 flex-shrink-0' viewBox="0 0 12 12" fill="none">
				<path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</button>

		{isOpen && (
			<div
				ref={refs.setFloating}
				className='@@beam-model-dropdown z-[10000]'
				style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
				onWheel={(event) => event.stopPropagation()}
			>
				<div className='@@beam-model-search'>
					<Search className='size-3.5 flex-shrink-0 text-beam-fg-3' />
					<input
						autoFocus
						placeholder='Search all models'
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>

				<div className='max-h-[300px] overflow-y-auto py-1'>
					{filteredGroups.map(group => (
						<div key={group.label}>
							<div className='@@beam-model-section'>{group.label}</div>
							{group.models.map(option => {
								const active = modelSelectionsEqual(option.selection, selectedOption.selection)
								const badge = badgeOfModel(option)
								return (
									<div
										key={`${option.selection.providerName}:${option.selection.modelName}`}
										className={`@@beam-model-item ${active ? 'active' : ''}`}
										onClick={() => {
											onChangeOption(option)
											setIsOpen(false)
											setQuery('')
										}}
									>
										<span className='min-w-0 flex-1 truncate text-[12.5px]'>{option.selection.modelName}</span>
										{badge && <span className={badge.className}>{badge.label}</span>}
										{active && <Check className='size-3.5 flex-shrink-0 text-[#93c5fd]' />}
									</div>
								)
							})}
						</div>
					))}
					{filteredGroups.length === 0 && <div className='px-3 py-6 text-center text-xs text-beam-fg-3'>No models found</div>}
				</div>
			</div>
		)}
	</div>
}


const MemoizedModelDropdown = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
	const settingsState = useSettingsState()
	const oldOptionsRef = useRef<ModelOption[]>([])
	const [memoizedOptions, setMemoizedOptions] = useState(oldOptionsRef.current)

	const { filter, emptyMessage } = modelFilterOfFeatureName[featureName]

	useEffect(() => {
		const oldOptions = oldOptionsRef.current
		const newOptions = settingsState._modelOptions.filter((o) => filter(o.selection, { chatMode: settingsState.globalSettings.chatMode, overridesOfModel: settingsState.overridesOfModel }))

		if (!optionsEqual(oldOptions, newOptions)) {
			setMemoizedOptions(newOptions)
		}
		oldOptionsRef.current = newOptions
	}, [settingsState._modelOptions, filter])

	if (memoizedOptions.length === 0) { // Pretty sure this will never be reached unless filter is enabled
		return <WarningBox text={emptyMessage?.message || 'No models available'} />
	}

	return <ModelSelectBox featureName={featureName} options={memoizedOptions} className={className} />

}

export const ModelDropdown = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
	const settingsState = useSettingsState()

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')

	const openSettings = () => { commandService.executeCommand(BEAM_OPEN_SETTINGS_ACTION_ID); };


	const { emptyMessage } = modelFilterOfFeatureName[featureName]

	const isDisabled = isFeatureNameDisabled(featureName, settingsState)
	if (isDisabled)
		return <WarningBox onClick={openSettings} text={
			emptyMessage && emptyMessage.priority === 'always' ? emptyMessage.message :
				isDisabled === 'needToEnableModel' ? 'Enable a model'
					: isDisabled === 'addModel' ? 'Add a model'
						: (isDisabled === 'addProvider' || isDisabled === 'notFilledIn' || isDisabled === 'providerNotAutoDetected') ? 'Provider required'
							: 'Provider required'
		} />

	return <ErrorBoundary>
		<MemoizedModelDropdown featureName={featureName} className={className} />
	</ErrorBoundary>
}
