import React from "react";
import styles from "../styles.module.scss";

interface DashboardProps {
  items: string[];
  onRemove: (index: number) => void;
  onItemClick?: (item: string, index: number) => void;
  emptyMessage?: string;
  title?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  items,
  onRemove,
  onItemClick,
  emptyMessage = "No categories added yet.",
  title = "Categories",
}) => {

const handleClick = (item : string, index: number) => {
  onItemClick?.(item, index);
  onRemove(index);
}

return (
  <div className={styles.dashboard}>
    {items.length === 0 ? (
      <p className={styles.emptyMessage}>{emptyMessage}</p>
    ) : (
      <div className={styles.dashboardList}>
        {
          items.map((item, index) => (
            <div key={index} 
            className={styles.dashboardItem}
            onClick={() => handleClick(item, index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key == "Enter" || e.key === " ") {
                handleClick(item, index)
              }
            }}
            >
              {item}
              <span className={styles.removeIcon}>&times;</span>
            </div>
          ))
        }
      </div>
    )}
  </div>
)
}

export default Dashboard