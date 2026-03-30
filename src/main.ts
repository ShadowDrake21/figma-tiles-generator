// Read the docs https://plugma.dev/docs

import { FormSettings } from "./config/defaultFormSettings"
import { formSettingsSchema } from "./config/formSettingsSchema"
import { handleFrameCreation } from "./frameCreation"
import { IncomingMessage } from "./types/message"
import { clearSettings, handleError, loadProfiles, loadSettings, saveProfile, saveSettings, sendType } from "./utils/pluginMessaging"

export default function () {
	figma.showUI(__html__, { width: 1200, height: 500, themeColors: true })

	setTimeout(() => {
		loadSettings().catch((e) => handleError("loading settings", e))
		loadProfiles().catch((e) => handleError("loading profiles", e))
	})

	figma.ui.onmessage = async (message: IncomingMessage) => {
		switch (message.type) {
			case "CREATE_FRAMES":
				try{
					const parsed = formSettingsSchema.safeParse(message.settings)
					if (!parsed.success) {
						sendType("ERROR", {
							message: "Invalid settings: " + parsed.error.issues.map(e => e.message).join(", ")
						})
						break
					}
					await handleFrameCreation(message.data, message.countrySlugs || [], parsed.data as FormSettings, message.pageName)
				} catch (e) {
					handleError("creating frames", e)
				}
				break;
				case "SAVE_SETTINGS":
					try {
						const parsed = formSettingsSchema.safeParse(message.settings)
						if (!parsed.success) {
							sendType("ERROR", {
								message: "Invalid settings: " + parsed.error.issues.map(e => e.message).join(", ")
							})
							break
						}
						await saveSettings(parsed.data as FormSettings)
					} catch (e) {
						handleError("saving settings", e)
					}
					break;
				case "LOAD_SETTINGS":
					try {
						await loadSettings()
					} catch (e) {
						handleError("loading settings", e)
					}
					break;
				case "CLEAR_STORAGE":
					try {
						await clearSettings()
					} catch (e) {
						handleError("clearing storage", e)
					}
					break;
				case "SAVE_PROFILES":
					try {
						await saveProfile(message.profiles)
					} catch (e) {
						handleError("saving profiles", e)
					}
					break;
				case "LOAD_PROFILES":
					try {
						await loadProfiles()
					} catch (e) {
						handleError("loading profiles", e)
					}
					break;
			default:
				console.warn("Unknown message type:", (message as any).type)
				break
			}
		}
}
