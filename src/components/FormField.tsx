import React from "react";
import styles from "../styles.module.scss";


interface FormFieldProps {
  label: string;
  type: "text" | "color" | "select";
  value: string | number;
  onChange: (value: string | number) => void;
  options?: Array<string | number | { value: string | number; label: string }>;
  style?: React.CSSProperties;
  labelOnTop?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  type,
  value,
  onChange,
  options = [],
  style,
  labelOnTop = false,
}) => {
  const renderInput = () => {
    switch (type) {
      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={style}
          />
        );
      case "color":
        return (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "select":
        return (
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((option) => {
              if (typeof option === "string" || typeof option === "number") {
                return (
                  <option key={option} value={option}>
                    {option}
                  </option>
                );
              }
              return (
                <option key={option.value + option.label} value={option.value}>
                  {option.label}
                </option>
              );
            })}
          </select>
        );
    }
  };

  return (
    <div className={styles.settingsItem}>
      <label className={labelOnTop ? styles.moveLabel : ""}>{label}</label>
      {renderInput()}
    </div>
  )
};

export default FormField;