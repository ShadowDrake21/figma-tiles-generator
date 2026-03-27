import z from "zod";

export const formSettingsSchema = z.object({
   width: z.string().optional().default("299"),
  height: z.string().optional().default("50"),
  backgroundColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color"),
  textColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color"),
  fontSize: z.string().optional().default("30"),
  lineHeight: z.string().optional().default("30"),
  fontWeight: z.string().optional().default("Regular"),
  spreadsheetColumns: z.array(z.string()),
  autoSaveProfiles: z.boolean().optional().default(true)
})