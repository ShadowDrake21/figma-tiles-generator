import React, { useState, useEffect } from 'react'
import styles from './styles.module.css' // Import CSS module for scoped styles
import './App.css' // Import CSS for styles
import { defaultFormSettings, FormSettings } from './config/defaultFormSettings'
import { useNotificationLog } from './hooks/useNotificationLog'
import { logMessage, MESSAGES } from './config/messages'
import SettingsForm from './components/SettingsForm'
import Notification from './components/Notification'

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

	const handleSaveProfile = () => {
		const key = formSettings.spreadsheetColumns.join(",")

		if (!key) {
			showNotification(MESSAGES.VALIDATION.MISSING_SPREADSHEET_COLUMNS_NAMES, "error", false, true, false)
			return;
		}

		const p = {...profiles, [key]: formSettings}
		    console.log("handleSaveProfile key, profiles before save:", key, profiles);

		saveProfilesToStorage(p)
		setSelectedProfile(key)

		window.parent.postMessage({
			pluginMessage: {
				type: "SAVE_SETTINGS",
				settings: formSettings
		}}, "*")
		showTemporaryNotification(`Saved settings for ${key}`, "success", 1000)
	}

	const handleSelectProfile = (key: string) => {
		if (key === "__new__") {
			setFormSettings(defaultFormSettings)
			setSelectedProfile("__new__")

			return
	}

	const s = profiles[key]

	if (s) {
		setFormSettings(s)
		setSelectedProfile(key)
		showTemporaryNotification(`Loaded settings for ${key}`, "info", 700)
	}
}

const handleDeleteProfile = (key: string) => {
	if (!profiles[key]) return;
	const copy = { ...profiles }
	delete copy[key]

	saveProfilesToStorage(copy)
	showTemporaryNotification(`Deleted profile ${key}`, "success", 800)

	if(formSettings.spreadsheetColumns.join(",") === key) setFormSettings(defaultFormSettings)
	if(selectedProfile === key) setSelectedProfile("")
}

const handleGenerate = async () => {
	const {spreadsheetColumns} = formSettings

	if (!spreadsheetColumns || spreadsheetColumns.length === 0) {
		showNotification(MESSAGES.VALIDATION.MISSING_SPREADSHEET_COLUMNS_NAMES, "error", false, true, false)
		return;
	}

	setIsLoading(true)
	clearLog()
	showNotification(MESSAGES.PROCESS.FETCHING_DATA, "working", true, false)

	try {
	console.log("Fetching data for", { spreadsheetColumns });
	const baseUrl = import.meta.env.VITE_DYNAMIC_BASE_URL;
	const url = `${baseUrl}/static/category_titles/`
	const res = await fetch(url, {
		method: "GET",
		headers: {
			 Accept: "application/json",
          "Content-Type": "application/json",
          skip_zrok_interstitial: "1",
          Origin: "https://figma.com",
          "User-Agent": "Figma-Plugin",
		}
	})

	if (!res.ok) {
		let errorMessage = `Failed to fetch data (${res.status})`
		throw new Error(errorMessage)
	}

	const json = await res.json()
	if (!json.data || Object.keys(json.data).length === 0) {
		throw new Error(MESSAGES.ERRORS.NO_DATA_FOUND(spreadsheetColumns))
	}

	showNotification(MESSAGES.PROCESS.DATA_FETCHED, "success", true, false)

	window.parent.postMessage({
		pluginMessage: {
			type: "CREATE_FRAMES",
			data: json.data,
			settings: formSettings,
			pageName: "Category Tiles"
		}
	}, "*")
	} catch (error) {
		logMessage.generateError(error)
		setIsLoading(false)

		let message = "Uknown error occurred"
	
		if (error instanceof Error) message = error.message
		else if (typeof error === "string") message = error

		showNotification(message, "error", false, true, false)
	}
}

const handleClearStorage = () => {
	window.parent.postMessage({
		pluginMessage: {
			type: "CLEAR_STORAGE"
		}
	}, "*")
}

const handleRecacheSheet = async () => {
	const {spreadsheetColumns} = formSettings

	setIsLoading(true)
	showNotification("Recaching sheet data...", "working", true, false)
	
	try {
	const baseUrl = import.meta.env.VITE_DYNAMIC_BASE_URL;
	const url = `${baseUrl}/static/category_titles/force-refresh`
	const res = await fetch(url, {
		method: "GET",
		headers: {
			 Accept: "application/json",
					"Content-Type": "application/json",
					skip_zrok_interstitial: "1",
					Origin: "https://figma.com",
					"User-Agent": "Figma-Plugin",
		}
	})

	if (!res.ok) {
		throw new Error(`Failed to recache sheet (${res.status})`)
	}
	
	const json = await res.json()
	setIsLoading(false)

	const message = json.message || "Sheet recached successfully!"
	const isError = message.toLowerCase().includes("error")
	showNotification(message, isError ? "error" : "success", false, true, false)
}
	catch (error) {
		setIsLoading(false)
		let message = "Failed to recache sheet"
		if (error instanceof Error) message = error.message
		else if (typeof error === "string") message = error
		showNotification(message, "error", false, true, false)
	}
}

	return (
		<div className={styles.container}>
			<SettingsForm formSettings={formSettings}
			onChange={handleInputChange}
			onGenerate={handleGenerate}
			onRecacheSheet={handleRecacheSheet}
			onClearStorage={handleClearStorage}
			onDeleteProfile={handleDeleteProfile}
			onSaveProfile={handleSaveProfile}
				isLoading={isLoading}
				profiles={profiles}
				selectedProfile={selectedProfile}
				onSelectProfile={(k: string) => handleSelectProfile(k)}
				/>
				{
					(notification.text || notification.isClosing) && (
						<Notification 
						text={notification.text}
						type={notification.type}
						onClose={hideNotification}
						disableClose={notification.disableClose}
						isClosing={notification.isClosing}
						isRevealing={notification.isRevealing}
						hasRevealed={notification.hasRevealed}
						logHistory={logHistory}
						/>)
				}
		</div>
	)
}

export default App
