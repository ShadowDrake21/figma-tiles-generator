export type FormSettings = {
  width: string;
  height: string;
  backgroundColor: string;
  textColor: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  spreadsheetColumns: string[];
  autoSaveProfiles: boolean;
};

export const defaultFormSettings: FormSettings = {
  width: "299",
  height: "50",
  backgroundColor: "#FF2F00",
  textColor: "#FFFFFF",
  fontSize: "30",
  lineHeight: "30",
  fontWeight: "Regular",
  spreadsheetColumns: ["Sofas", "Chairs", "Tables", "Beds", "Storage"],
  autoSaveProfiles: true,
};
