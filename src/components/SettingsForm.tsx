import { FormSettings } from "../config/defaultFormSettings";
import { FONT_WEIGHTS } from "../config/typography";
import styles from "../styles.module.scss";
import Dashboard from "./Dashboard";
import FormField from "./FormField";

interface SettingsFormProps {
  formSettings: FormSettings;
  onChange: (field: string, value: any) => void;
  onGenerate: () => void;
  onClearStorage: () => void,
  onRecacheSheet: () => void,
  isLoading: boolean;
  categoryOptions?: string[];
  profiles?: string[];
  selectedProfile?: string;
  onSelectProfile?: (key: string) => void;
  onSaveProfile?: () => void;
  onDeleteProfile?: (key: string) => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  formSettings,
  onChange,
  onGenerate,
  onClearStorage,
  onRecacheSheet,
  isLoading,
  categoryOptions = [],
  profiles = [],
  selectedProfile = "",
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
}) => {
  return (
    <>
    <div className={styles.profileRow}>
      <FormField
      label="Saved profiles"
      type="select"
      value={selectedProfile}
      onChange={(value) => onSelectProfile && onSelectProfile(String(value))}
      options={[{value: "__new__", label: "New profile..."}, ...profiles.map(p => ({
        value: p,
        label: p,
      }))]}
      />
       <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onSaveProfile && onSaveProfile()}>Save</button>
          <button
            onClick={() => onDeleteProfile && onDeleteProfile(selectedProfile)}
            disabled={!selectedProfile || selectedProfile === "__new__"}
          >
            Delete
          </button>
        </div>
    </div>
    <div className={styles.basicSettings}>
      <div className={styles.sheet}>
        <FormField
        label="Tile width"
        type="text"
        value={formSettings.width}
        onChange={(value) => onChange("width", value)}
        labelOnTop={!!formSettings.width}
        />
        <FormField
        label="Tile height"
        type="text"
        value={formSettings.height}
        onChange={(value) => onChange("height", value)}
        labelOnTop={!!formSettings.height}
        />
      </div>
        <div className={styles.secondRow}>
        <FormField
        label="Background"
        type="color"
        value={formSettings.backgroundColor}
        onChange={(value) => onChange("backgroundColor", value)}
        />
        <FormField
        label="Color"
        type="color"
        value={formSettings.textColor}
        onChange={(value) => onChange("textColor", value)}
        />
      </div>
    </div>
     <div className={styles.linesSettings}>
      <div className={styles.firstLine}>
        <FormField
        label="Font size"
        type="text"
        value={formSettings.fontSize}
        onChange={(value) => onChange("fontSize", value)}
        labelOnTop={!!formSettings.fontSize}
        />
        <FormField
        label="Line height"
        type="text"
        value={formSettings.lineHeight}
        onChange={(value) => onChange("lineHeight", value)}
        labelOnTop={!!formSettings.lineHeight}
        />
        <FormField
        label="Weight"
        type="select"
        value={formSettings.fontWeight}
        onChange={(value) => onChange("fontWeight", value)}
        options={FONT_WEIGHTS as unknown as string[]}
        />
      </div>
    </div>
    <div className={styles.columnsSettings}>
      <div className={styles.firstLine}>
        <FormField
        label="Categories"
        type="select"
        value={formSettings.spreadsheetColumns[0] || ""}
        onChange={(value) => onChange("spreadsheetColumns", [value])}
        options={categoryOptions}
        />
        <Dashboard
        items={formSettings.spreadsheetColumns}
        onRemove={(index) => {
          const newColumns = [...formSettings.spreadsheetColumns];
          newColumns.splice(index, 1);
          onChange("spreadsheetColumns", newColumns);
        }}
        />
      </div>
    </div>
      </>
  )
}

// zrobić możliwość wyboru kategorii z listy wszystkich kategorii (pobiera się z Category Titles)

// zrobić searching po kategoriach w inputcie i wybieranie z listy pod spodem (z tej samej listy co wyżej)

// pobierać listę kategorii ze spreadsheetu na początku i zapisywać w stanie, żeby potem można było z niej korzystać do wybierania kategorii do generowania

export default SettingsForm