import styles from "../styles.module.scss";

interface NotificationProps {
  text: string;
  type?: "success" | "error" | "working" | "info";
  onClose?: () => void;
  disableClose?: boolean;
  isClosing?: boolean;
  isRevealing?: boolean;
  hasRevealed?: boolean;
  logHistory?: Array<{
    id: string;
    text: string;
    type: "success" | "error" | "working" | "info";
    timestamp: string;
  }>;
}

export default function Notification({
  text,
  type = "info",
  onClose,
  disableClose = false,
  isClosing = false,
  isRevealing = false,
  hasRevealed = false,
  logHistory = [],
}: NotificationProps) {
  const handleContentClick = () => {
    if (!disableClose && onClose) {
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`${styles.notification} ${styles[type]} ${isClosing ? styles.closing : ""} ${isRevealing ? styles.revealing : ""} ${hasRevealed ? styles.revealed : ""}`}
    >
      <div className={styles.notificationContent} onClick={handleContentClick}>
        <div className={styles.currentMessage}>{text}</div>

        {logHistory && logHistory.length > 1 && (
          <div className={styles.logStack}>
            {logHistory.slice(1).map((log, index) => (
              <div
                key={log.id}
                className={`${styles.logStackItem} ${styles[`logLevel${index + 1}`]}`}
                data-level={index + 1}
              >
                {log.text}
              </div>
            ))}
          </div>
        )}

        {!disableClose && (
          <button
            className={styles.closeButton}
            onClick={handleCloseClick}
            aria-label="Close notification"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
