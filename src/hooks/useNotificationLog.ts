import { useCallback, useState } from "react";

export type LogEntryType  = "success" | "error" | "working" | "info";

export interface LogEntry {
  id: string;
  text: string;
  type: LogEntryType;
  timestamp: string;
}

export interface NotificationState {
  text: string;
  type: LogEntryType;
  disableClose: boolean;
  isVisible: boolean;
  isClosing: boolean;
  isRevealing: boolean;
  hasRevealed: boolean;
}

const initialNotification: NotificationState = {
  text: "",
  type: "info",
  disableClose: false,
  isVisible: false,
  isClosing: false,
  isRevealing: false,
  hasRevealed: false,
}

export const useNotificationLog = () => {
  const [notification, setNotification] = useState<NotificationState>(initialNotification);
  const [logHistory, setLogHistory] = useState<LogEntry[]>([]);

  const addToLogHistory = useCallback(
    (text: string, type: LogEntryType = "info") => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 11)
      const timestamp = new Date().toLocaleTimeString()

      setLogHistory((prev) => {
        if (prev.length > 0 && prev[0].text === text) return prev
        const newLog: LogEntry = { id, text, type, timestamp }
        return [newLog, ...prev].slice(0, 20)
      })
    },
    []
  )

  const showNotification = useCallback(
    (
      text: string,
      type: LogEntryType = "info",
      disableClose = false,
      animate = false,
      addToLog = true
    ) => {
      const isNewSession = !notification.text

      setNotification((prev) => ({
        ...prev,
        text,
        type,
        disableClose,
        isVisible: true,
      }))

      if (addToLog) addToLogHistory(text, type)
      if (animate && isNewSession) {
        setNotification((prev) => ({
          ...prev,
          hasRevealed: false,
          isClosing: false,
          isRevealing: true,
        }))

        setTimeout(() => {
          setNotification((prev) => ({
            ...prev,
            isRevealing: false,
            hasRevealed: true,
          }))
        }, 300)
      } else if (!notification.hasRevealed && !notification.isRevealing && !notification.isClosing) {
        setNotification((prev) => ({
          ...prev,
          hasRevealed: true,
        }))
      }
    },
    [addToLogHistory, notification]
  )

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({
      ...prev,
      isClosing: true,
      hasRevealed: false,
    }))
    setTimeout(() => {
      setNotification(initialNotification)
    }, 300)
  }, [])

  const showTemporaryNotification = useCallback(
    (
      text: string,
      type: LogEntryType = "info",
      duration = 2000,
      addToLog = false
    ) => {
      showNotification(text, type, false, true, addToLog)
      setTimeout(() => hideNotification(), duration)
    },
    [hideNotification, showNotification]
  )

  const clearLog = useCallback(() => setLogHistory([]), [])

  return {
    notification,
    logHistory,
    addToLogHistory,
    showNotification,
    hideNotification,
    showTemporaryNotification,
    clearLog, 
    setNotification
  }
}