export const MESSAGES = {
  VALIDATION: {
    SPREADSHEET_COLUMNS_NAME: "You have not choosen any spreadsheet columns. Please select at least one column to proceed."
  },

  PROCESS: {
    FETCHING_DATA: "Fetching data from spreadsheet...",
    DATA_FETCHED: "Data fetched successfully!",
    PAGE_CREATED: (pageName: string) => `Created new page: "${pageName}"`,
    PAGE_SWITCHED: (pageName: string) => `Switched to page: "${pageName}"`,
    FRAME_PROCESSING_STARTED: (count: number) => `Processing ${count} frame(s)...`,
    COUNTRY_PROCESSING: (country: string, current: number, total: number) =>
      `Processing frames ${current}/${total} (${country})`,
    FRAME_CREATED: (country: string) => `Created frame for ${country}`,
    FRAME_UNCHANGED: (country: string) => `No changes for ${country} (skipped)`,
    FRAME_UPDATED: (country: string) => `Updated frame for ${country}`,
    MISSING_TRANSLATION: (country: string, category: string) => `${country} has no ${category} translation - creating placeholder frame`,
    PROCESSING_COMPLETE: (
      created: number,
      missing: number = 0,
      missingCountries: string[] = [],
      updated: number = 0,
      skipped: number = 0
    ) => {
      const parts: string[] = []
      parts.push(`Created ${created}`)
      if (updated) parts.push(`Updated ${updated}`)
      if (skipped) parts.push(`Skipped ${skipped}`)
      if (missing) 
        parts.push(`Missing ${missing}${missingCountries.length ? ` (${missingCountries.join(", ")})` : ""}`)
      return parts.join(" | ") + " frame(s)"
    }
  },

  STORAGE: {
    SETTINGS_SAVED: "Settings saved successfully!",
    STORAGE_CLEARED: "Storage cleared successfully!"
  },

  ERRORS: {
    GENERAL_ERROR: (message: string) => `Error: ${message}`,
    FETCH_ERROR: (url: string) => `Failed to fetch data from: ${url}`,
    NO_DATA_FOUND: (categories: string[]) => `No categories ${categories.length ? `(${categories.join(", ")})` : ""} found in spreadsheet.`,
    CREATE_FRAME_ERROR: (country: string, category: string, error: string) => 
      `Failed to create frame for ${country} (${category}): ${error}`,
  } 
} as const;

export const CONSOLE_LOGS = {
  FRAME_PROCESSING_STARTED: (message: string) => `Starting frame processing: ${message}`,
  COUNTRY_PROCESSING: (message: string) => `Processing country: ${message}`,
  MISSING_TRANSLATION: (message: string) => `Missing translation: ${message}`,
  FRAME_CREATED: (message: string) => `Frame created: ${message}`,
  FRAME_UNCHANGED: (message: string) => `Frame unchanged: ${message}`,
  FRAME_UPDATED: (message: string) => `Frame updated: ${message}`,
  PROCESSING_SUCCESS: (message: string) => `Success: ${message}`,

  SETTINGS_LOADED: (settings: any) => ['Loading saved settings:', settings],
  SETTINGS_SAVED: (message: string) => `Settings saved: ${message}`,
  STORAGE_CLEARED: (message: string) => `Storage cleared: ${message}`,

  ERROR_FROM_MAIN: (message: string) => `Error from main thread: ${message}`,
  GENERATE_ERROR: (error: unknown) => [`Error generating frames: `, error]
} as const

export const logMessage = {
  frameProcessingStarted: (message: string) =>
    console.log(CONSOLE_LOGS.FRAME_PROCESSING_STARTED(message)),
  countryProcessing: (message: string) =>
    console.log(CONSOLE_LOGS.COUNTRY_PROCESSING(message)),
  missingTranslation: (message: string) =>
    console.log(CONSOLE_LOGS.MISSING_TRANSLATION(message)),
  frameCreated: (message: string) =>
    console.log(CONSOLE_LOGS.FRAME_CREATED(message)),
  processingSuccess: (message: string) =>
    console.log(CONSOLE_LOGS.PROCESSING_SUCCESS(message)),
  settingsLoaded: (settings: any) =>
    console.log(...CONSOLE_LOGS.SETTINGS_LOADED(settings)),
  settingsSaved: (message: string) =>
    console.log(CONSOLE_LOGS.SETTINGS_SAVED(message)),
  storageCleared: (message: string) =>
    console.log(CONSOLE_LOGS.STORAGE_CLEARED(message)),
  errorFromMain: (message: string) =>
    console.error(CONSOLE_LOGS.ERROR_FROM_MAIN(message)),
  generateError: (error: unknown) =>
    console.error(...CONSOLE_LOGS.GENERATE_ERROR(error)),
};