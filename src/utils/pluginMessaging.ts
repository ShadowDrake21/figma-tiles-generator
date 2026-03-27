import { FormSettings } from "../config/defaultFormSettings"
import { MESSAGES } from "../config/messages"
import { UiMessageBase } from "../types/message"

export const STORAGE_KEY = "formSettings"
export const PROFILES_STORAGE_KEY = "savedFormSettingsProfiles"

export const send = (msg: UiMessageBase) => figma.ui.postMessage(msg)

export const sendType = (type: string, extra: Record<string, any> = {}) => send({ type, ...extra })

export const handleError = (context: string, error: unknown) => {
  console.error(`Error ${context}:`, error);
  sendType("ERROR", {
    message: `Error ${context}: ${error instanceof Error ? error.message : String(error)}`
  })
}

export const saveToStorage = async (key: string, value: any) => {
  await figma.clientStorage.setAsync(key, value)
}

export const loadFromStorage = async (key: string) => {
  return await figma.clientStorage.getAsync(key)
}

export const saveSettings = async (settings: FormSettings) => {
  await saveToStorage(STORAGE_KEY, settings)
  sendType("SETTINGS_SAVED", { message: MESSAGES.STORAGE.SETTINGS_SAVED })
}

export const loadSettings = async () => {
  const saved = (await loadFromStorage(STORAGE_KEY)) as FormSettings | undefined

  if (saved) sendType("SETTINGS_LOADED", { settings: saved })
}

export const saveProfile = async (profiles: Record<string, FormSettings>) => {
  await saveToStorage(PROFILES_STORAGE_KEY, profiles)
}

export const loadProfiles = async () => {
  const saved = (await loadFromStorage(PROFILES_STORAGE_KEY)) as Record<string, FormSettings> | undefined

  if (saved) sendType("PROFILES_LOADED", { profiles: saved })
}

export const clearSettings = async () => {
  await figma.clientStorage.deleteAsync(STORAGE_KEY)
  sendType("STORAGE_CLEARED", { message: MESSAGES.STORAGE.STORAGE_CLEARED })
}