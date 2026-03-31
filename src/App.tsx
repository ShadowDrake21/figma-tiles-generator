import React, { useState, useEffect } from "react";
import styles from "./styles.module.scss"; // Import CSS module for scoped styles
import {
  defaultFormSettings,
  FormSettings,
} from "./config/defaultFormSettings";
import { useNotificationLog } from "./hooks/useNotificationLog";
import { logMessage, MESSAGES } from "./config/messages";
import SettingsForm from "./components/SettingsForm";
import Notification from "./components/Notification";

const App: React.FC = () => {
  const [formSettings, setFormSettings] = useState<FormSettings>({...defaultFormSettings, spreadsheetColumns: [],});
  const [profiles, setProfiles] = useState<Record<string, FormSettings>>({});
  const [selectedProfile, setSelectedProfile] = useState<string>("__new__");
  const [isLoading, setIsLoading] = useState(false);
	const [translationsByCategory, setTranslationsByCategory] = useState<Record<string, Record<string, string>>>({})

  const {
    notification,
    logHistory,
    showNotification,
    addToLogHistory,
    hideNotification,
    showTemporaryNotification,
    clearLog,
    setNotification,
  } = useNotificationLog();

	  const fetchCategoryData = async (): Promise<Record<string, Record<string, string>>> => {
      const baseUrl = import.meta.env.VITE_DYNAMIC_BASE_URL;
      const url = `${baseUrl}category_titles/`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          skip_zrok_interstitial: "1",
          Origin: "https://figma.com",
          "User-Agent": "Figma-Plugin",
        },
      });

      if (!res.ok) {
        let errorMessage = `Failed to fetch data (${res.status})`;
        throw new Error(errorMessage);
      }

      const json = await res.json();
			console.log('json', json);
			
      if (!json.data || typeof json.data !== "object" || Object.keys(json.data).length === 0) {
        throw new Error(MESSAGES.ERRORS.NO_DATA_FOUND(json.data));
      }

			return json.data as Record<string, Record<string, string>>;
  };

	useEffect(() => {
		const initializeData = async () => {
			setIsLoading(true);
			try {
				const data = await fetchCategoryData();

        const filteredData = {...data}
        delete filteredData["slug"]
				setTranslationsByCategory(filteredData);
				showTemporaryNotification("Category translations loaded from spreadsheet", "success", 1500);
			} catch (error) {
				logMessage.generateError(error);
				const message = error instanceof Error ? error.message :" Unknown error loading categories"
				showNotification(message, "error", false, true, false);
			} finally {
				setIsLoading(false);
			}
		}

		initializeData();
	}, [])

  useEffect(() => {
   setFormSettings({ ...defaultFormSettings, spreadsheetColumns: [] });
    setSelectedProfile("__new__");
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormSettings((prev) => ({ ...prev, [field]: value} as FormSettings));
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data.pluginMessage;

      if (!message) return;

      if ((window as any).__figmaMessageTimeout) {
        clearTimeout((window as any).__figmaMessageTimeout);
        delete (window as any).__figmaMessageTimeout;
      }

      switch (message.type) {
        case "MISSING_SPREADSHEET_COLUMNS_NAMES":
          showNotification(message.message, "error", false, true, false);
          break;

        case "PAGE_CREATED":
        case "PAGE_SWITCHED":
          showNotification(message.message, "info", false, false, true);
          break;

        case "FRAME_PROCESSING_STARTED":
          logMessage.frameProcessingStarted(message.message);
          showNotification(message.message, "working", true, false);
          break;

        case "COUNTRY_PROCESSING":
          logMessage.countryProcessing(message.message);
          setNotification((prev) => ({
            ...prev,
            text: message.message,
            type: "working",
            disableClose: true,
            isVisible: true,
          }));
          break;

        case "MISSING_TRANSLATION":
          logMessage.missingTranslation(message.message);
          addToLogHistory(message.message, "error");
          break;

        case "FRAME_CREATED":
          logMessage.frameCreated(message.message);
          break;

        case "FRAME_UNCHANGED":
          logMessage.frameCreated(message.message);
          break;

        case "FRAMES_CREATED":
          logMessage.processingSuccess(message.message);
          setIsLoading(false);
          if (message.missingTranslations?.length) {
            message.missingTranslations.forEach((country: string) =>
              addToLogHistory(
                `Created placeholder frame for ${country} - translation missing`,
              ),
            );
          }
          if (
            typeof message.framesUpdated === "number" ||
            typeof message.framesSkipped === "number"
          ) {
            const parts: string[] = [];

            if (message.framesUpdated)
              parts.push(`updated : ${message.framesUpdated}`);
            if (message.framesSkipped)
              parts.push(`skipped : ${message.framesSkipped}`);

            if (parts.length)
              addToLogHistory(`Summary: ${parts.join(", ")}`, "info");
          }
          setNotification((prev) => ({
            ...prev,
            text: message.message,
            type: "success",
            disableClose: false,
            isVisible: true,
          }));
          break;

        case "SETTINGS_LOADED":
          break;

        case "SETTINGS_SAVED":
          logMessage.settingsSaved(message.message);
          break;

        case "PROFILES_LOADED":
          if (message.profiles) {
            console.log("Loaded profiles from storage:", message.profiles);
            setProfiles(message.profiles);
          }
          break;

        case "STORAGE_CLEARED":
          logMessage.storageCleared(message.message);
          setFormSettings(defaultFormSettings);
          showTemporaryNotification(
            MESSAGES.STORAGE.STORAGE_CLEARED,
            "success",
            1000,
          );
          break;

        case "ERROR":
          logMessage.errorFromMain(message.message);
          setIsLoading(false);
          showNotification(
            MESSAGES.ERRORS.GENERAL_ERROR(message.message),
            "error",
            false,
            true,
          );
          break;

        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    addToLogHistory,
    showNotification,
    showTemporaryNotification,
    setNotification,
  ]);

  const saveProfilesToStorage = (p: Record<string, FormSettings>) => {
    console.log("Saving profiles to storage: ", p);
    setProfiles(p);

    if (selectedProfile && !p[selectedProfile]) setSelectedProfile("");

    window.parent.postMessage(
      {
        pluginMessage: {
          type: "SAVE_PROFILES",
          profiles: p,
        },
      },
      "*",
    );
  };

  const handleSaveProfile = () => {
    const key = formSettings.profileName || "New profile " + (Object.keys(profiles).length ? Object.keys(profiles).length + 1 : "1");

    if (!key) {
      showNotification(
        MESSAGES.VALIDATION.MISSING_SPREADSHEET_COLUMNS_NAMES,
        "error",
        false,
        true,
        false,
      );
      return;
    }

    const p = { ...profiles, [key]: formSettings };
    console.log("handleSaveProfile key, profiles before save:", key, profiles);

    saveProfilesToStorage(p);
    setSelectedProfile(key);

    window.parent.postMessage(
      {
        pluginMessage: {
          type: "SAVE_SETTINGS",
          settings: formSettings,
        },
      },
      "*",
    );
    showTemporaryNotification(`Saved settings for ${key}`, "success", 1000);
  };

  const handleSelectProfile = (key: string) => {
    if (key === "__new__") {
      setFormSettings(defaultFormSettings);
      setSelectedProfile("__new__");

      return;
    }

    const s = profiles[key];

    if (s) {
      setFormSettings(s);
      setSelectedProfile(key);
      showTemporaryNotification(`Loaded settings for ${key}`, "info", 700);
    }
  };

  const handleDeleteProfile = (key: string) => {
    if (!profiles[key]) return;
    const copy = { ...profiles };
    delete copy[key];

    saveProfilesToStorage(copy);
    showTemporaryNotification(`Deleted profile ${key}`, "success", 800);

    if (formSettings.spreadsheetColumns.join(",") === key)
      setFormSettings(defaultFormSettings);
    if (selectedProfile === key) setSelectedProfile("");
  };

  const handleGenerate = async () => {
    const { spreadsheetColumns } = formSettings;

    if (!spreadsheetColumns || spreadsheetColumns.length === 0) {
      showNotification(
        MESSAGES.VALIDATION.MISSING_SPREADSHEET_COLUMNS_NAMES,
        "error",
        false,
        true,
        false,
      );
      return;
    }

    setIsLoading(true);
    clearLog();
    showNotification(MESSAGES.PROCESS.FETCHING_DATA, "working", true, false);

    try {
     const frameData: Record<string, string[]> = {};
		 const slugSet = new Set<string>()

		 spreadsheetColumns.forEach((cat) => {
			const catData = translationsByCategory[cat];
			if (catData) {
				Object.keys(catData).forEach((slug) => slugSet.add(slug))
			}
		 })

		 for(const slug of slugSet) {
			const row = spreadsheetColumns.map((cat) => translationsByCategory[cat]?.[slug] || "")
			frameData[slug] = row;
		 }
		 
      showNotification(MESSAGES.PROCESS.DATA_FETCHED, "success", true, false);

      window.parent.postMessage(
        {
          pluginMessage: {
            type: "CREATE_FRAMES",
            data: frameData,
						countrySlugs: [                
            "uk","pl","de","at","chde","nl","fr","chfr","es","pt","it",
            "dk","no","fi","se","cz","sk","hu","befr","benl","ro","chit"
          ],
            settings: formSettings,
            pageName: "Category Tiles",
          },
        },
        "*",
      );
    } catch (error) {
      logMessage.generateError(error);
      const message = error instanceof Error ? error.message : "Unknown error occured"
      showNotification(message, "error", false, true, false);
    } finally {
			setIsLoading(false);
		}
  };

  const handleClearStorage = () => {
    window.parent.postMessage(
      {
        pluginMessage: {
          type: "CLEAR_STORAGE",
        },
      },
      "*",
    );
  };

  const handleRecacheSheet = async () => {
    setIsLoading(true);
    showNotification("Recaching sheet data...", "working", true, false);

    try {
      const baseUrl = import.meta.env.VITE_DYNAMIC_BASE_URL;
      const url = `${baseUrl}category_titles/force-refresh`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          skip_zrok_interstitial: "1",
          Origin: "https://figma.com",
          "User-Agent": "Figma-Plugin",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to recache sheet (${res.status})`);
      }

      const json = await res.json();
      setIsLoading(false);

      const message = json.message || "Sheet recached successfully!";
      const isError = message.toLowerCase().includes("error");
      showNotification(
        message,
        isError ? "error" : "success",
        false,
        true,
        false,
      );
			
			const data = await fetchCategoryData();
			setTranslationsByCategory(data);
    } catch (error) {
      setIsLoading(false);
      let message = "Failed to recache sheet";
      if (error instanceof Error) message = error.message;
      else if (typeof error === "string") message = error;
      showNotification(message, "error", false, true, false);
    }
  };

  return (
    <div className={styles.container}>
      <SettingsForm
        formSettings={formSettings}
        onChange={handleInputChange}
        onGenerate={handleGenerate}
        onRecacheSheet={handleRecacheSheet}
        onClearStorage={handleClearStorage}
        onDeleteProfile={handleDeleteProfile}
        onSaveProfile={handleSaveProfile}
        isLoading={isLoading}
        profiles={Object.keys(profiles)}
        selectedProfile={selectedProfile}
        onSelectProfile={(k: string) => handleSelectProfile(k)}
				categoryOptions={Object.keys(translationsByCategory).filter(cat => cat !== "slug").sort((a, b) => a.localeCompare(b))}
      />
      {(notification.text || notification.isClosing) && (
        <Notification
          text={notification.text}
          type={notification.type}
          onClose={hideNotification}
          disableClose={notification.disableClose}
          isClosing={notification.isClosing}
          isRevealing={notification.isRevealing}
          hasRevealed={notification.hasRevealed}
          logHistory={logHistory}
        />
      )}
    </div>
  );
};

export default App;
