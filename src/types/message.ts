import { FormSettings } from "../config/defaultFormSettings";

export interface UiMessageBase {
  type: string;
  message?: string;
  [key: string]: any;
}

export interface CreateFramesMessage {
  type: "CREATE_FRAMES";
  data: Record<string, string[]>
  settings: FormSettings;
  pageName: string;
}

export interface SaveSettingsMessage {
  type: "SAVE_SETTINGS";
  settings: FormSettings;
}

export interface LoadSettingsMessage {
  type: "LOAD_SETTINGS";
}

export interface ClearStorageMessage {
  type: "CLEAR_STORAGE";
}

export interface SaveProfilesMessage {
  type: "SAVE_PROFILES";
  profiles: Record<string, FormSettings>;
}

export interface LoadProfilesMessage {
  type: "LOAD_PROFILES";
}

export type IncomingMessage = 
  | CreateFramesMessage
  | SaveSettingsMessage
  | LoadSettingsMessage
  | ClearStorageMessage
  | SaveProfilesMessage
  | LoadProfilesMessage;