import React, { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import Icon from './components/Icon'
import Input from './components/Input'
import Button from './components/Button'
import './App.css' // Import CSS for styles
import { defaultFormSettings, FormSettings } from './config/defaultFormSettings'
import { useNotificationLog } from './hooks/useNotificationLog'
import { logMessage, MESSAGES } from './config/messages'

const App: React.FC = () => {
	const [formSettings, setFormSettings] = useState(defaultFormSettings)
	const [profiles, setProfiles] = useState<Record<string, FormSettings>>({})
	const [selectedProfile, setSelectedProfile] = useState<string>("__new__")
	const [isLoading, setIsLoading] = useState(false)
	const {
	notification, logHistory, showNotification, addToLogHistory, hideNotification, showTemporaryNotification, clearLog, setNotification
	} = useNotificationLog()

	const handleInputChange = (field: string, value: any) => {
		const updated = {...formSettings, [field]: value } as any;
		setFormSettings(updated)
	}

	React.useEffect(() => {
		if (!formSettings.autoSaveProfiles) return;
		const key = formSettings.spreadsheetColumns.join(",");

		if (!key) return;

		const t = setTimeout(() => {
			if (JSON.stringify(profiles[key]) !== JSON.stringify(formSettings)) {
				const p = {...profiles, [key]: formSettings}
				saveProfilesToStorage(p)
				setSelectedProfile(key)
		}}, 800)
		return () => clearTimeout(t)
	}, [formSettings, profiles])

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data.pluginMessage
			
			if(!message) return;

			if ((window as any).__figmaMessageTimeout) {
				clearTimeout((window as any).__figmaMessageTimeout)
				delete (window as any).__figmaMessageTimeout
			}

			switch (message.type) {
				case "MISSING_SPREADSHEET_COLUMNS_NAMES": 
				showNotification(message.message, "error", false, true, false)
				break;
			
				case "PAGE_CREATED":
				case "PAGE_SWITCHED":
					showNotification(message.message, "info", false, false, true)
				break;

				case "FRAME_PROCESSING_STARTED":
					logMessage.frameProcessingStarted(message.message)
					showNotification(message.message, "working", true, false)
					break;

				case "COUNTRY_PROCESSING":
					logMessage.countryProcessing(message.message)
					setNotification((prev) => ({
						...prev, 
						text: message.message,
						type: "working",
						disableClose: true,
						isVisible: true
					}))
					break;

				case "MISSING_TRANSLATION":
					logMessage.missingTranslation(message.message)
					addToLogHistory(message.message, "error")
					break;

				case "FRAME_CREATED":
					logMessage.frameCreated(message.message)
					break;

				case "FRAME_UNCHANGED":
					logMessage.frameCreated(message.message)
					break;

				case "FRAMES_CREATED":
					logMessage.processingSuccess(message.message)
					setIsLoading(false)
					if(message.missingTranslations?.length) {
						message.missingTranslations.forEach((country: string) => 
							addToLogHistory(
								`Created placeholder frame for ${country} - translation missing`
							)
						)
					}
					if(typeof message.framesUpdated === 'number' 
						|| typeof message.framesSkipped === 'number') {
							const parts: string[] = []

							if (message.framesUpdated) parts.push(`updated : ${message.framesUpdated}`)
							if (message.framesSkipped) parts.push(`skipped : ${message.framesSkipped}`)

							if (parts.length) 
								addToLogHistory(`Summary: ${parts.join(", ")}`, "info")
							
						}
						setNotification((prev) => ({
							...prev, 
							text: message.message,
							type: "success",
							disableClose: false,
							isVisible: true
						})
					)
					break

					case "SETTINGS_LOADED":
						if (message.settings) {
							logMessage.settingsLoaded(message.settings)
							setFormSettings(message.settings)
						}
						break;
						
					case "SETTINGS_SAVED":
						logMessage.settingsSaved(message.message)
						break;

						case "PROFILES_LOADED":
							if (message.profiles) {
								console.log("Loaded profiles from storage:", message.profiles);
								setProfiles(message.profiles)
							}
							break;

						case "STORAGE_CLEARED":
							logMessage.storageCleared(message.message)
							setFormSettings(defaultFormSettings)
							showTemporaryNotification(MESSAGES.STORAGE.STORAGE_CLEARED, "success", 1000)
							break;

							case "ERROR":
								logMessage.errorFromMain(message.message)
								setIsLoading(false)
								showNotification(MESSAGES.ERRORS.GENERAL_ERROR(message.message), "error", false, true)
								break;

							default:
								break;
						}
			}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [
		addToLogHistory, showNotification, showTemporaryNotification, setNotification
	])

	const saveProfilesToStorage = (p: Record<string, FormSettings>) => {
		console.log("Saving profiles to storage: ", p);
		setProfiles(p)
		
		if(selectedProfile && !p[selectedProfile]) setSelectedProfile("")

		window.parent.postMessage({
			pluginMessage: {
				type: "SAVE_PROFILES",
				profiles: p
			}
		}, "*")
		
	}

	const createRectangles = (count: number) => {
		window.parent.postMessage(
			{
				pluginMessage: {
					type: 'CREATE_RECTANGLES',
					count,
				},
			},
			'*',
		)
	}

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data.pluginMessage
			if (message?.type === 'POST_NODE_COUNT') {
				setNodeCount(message.count)
			}
		}

		window.addEventListener('message', handleMessage)
		return () => {
			window.removeEventListener('message', handleMessage)
		}
	}, [])

	return (
		<div className="container">
			<div className="banner">
				<Icon svg="plugma" size={38} />
				<Icon svg="plus" size={24} />
				<img src={reactLogo} width="44" height="44" alt="Svelte logo" />
			</div>

			<div className="field create-rectangles">
				<Input
					type="number"
					value={rectCount}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRectCount(Number(e.target.value))}
				/>
				<Button onClick={() => createRectangles(rectCount)}>Create Rectangles</Button>
			</div>
			<div className="field node-count">
				<span>{nodeCount} nodes selected</span>
			</div>
		</div>
	)
}

export default App
