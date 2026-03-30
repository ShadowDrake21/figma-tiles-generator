import { FormSettings } from "./config/defaultFormSettings";
import { MESSAGES } from "./config/messages";

const solidPaint = figma.util.solidPaint;

const post = (type: string, extra: Record<string, any> = {}) =>
  figma.ui.postMessage({ type, ...extra });

const hasText = (value: string) => !!value && value.trim().length > 0;

const ensureFont = async (family: string, style: string) => {
  const font: FontName = { family, style };
  await figma.loadFontAsync(font);
  return font;
};

const buildTextNode = async ({
  content,
  baseFont,
  fontSize,
  lineHeight,
  fill,
}: {
  content: string;
  baseFont: FontName;
  fontSize: number;
  lineHeight: { value: number; unit: "PIXELS" | "PERCENT" };
  fill: string;
}) => {
  const node = figma.createText();
  await ensureFont(baseFont.family, baseFont.style);
  node.fontName = baseFont;
  node.characters = content;
  node.fontSize = fontSize;
  node.textAlignHorizontal = "CENTER";
  node.leadingTrim = "CAP_HEIGHT";
  node.lineHeight = { value: lineHeight.value, unit: "PIXELS" };
  node.fills = [solidPaint(fill)];
  return node;
};

const computeSignature = (lines: string[], s: FormSettings) => {
  return JSON.stringify([
    lines,
    s.width,
    s.height,
    s.backgroundColor,
    s.textColor,
    s.fontSize,
    s.lineHeight,
    s.fontWeight,
    s.spreadsheetColumns,
    s.autoSaveProfiles,
  ]);
};

const asInt = (raw: string | undefined, fallback: number) => {
  const n = parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
};

export const handleFrameCreation = async (
  data: Record<string, string[]>,
  countrySlugs: string[],
  settings: FormSettings,
  pageName: string,
) => {
  const {
    width,
    height,
    backgroundColor,
    textColor,
    fontSize,
    lineHeight,
    fontWeight,
    spreadsheetColumns,
    autoSaveProfiles,
  } = settings;

  const tileHeight = asInt(height, 50);
  const tileWidth = asInt(width, 299);
  const numCategories = spreadsheetColumns.length;
  const numCountries = countrySlugs.length;

  if (numCategories === 0) {
    post("ERROR", { message: "No categories selected" });
    return;
  }

  const totalTiles = numCountries * numCategories;

  post("FRAME_PROCESSING_STARTED", {
    message: `Creating ${totalTiles} tiles in ${numCategories} columns...`,
    totalCount: totalTiles,
  });

  let targetPage = figma.root.children.find((p) => p.name === pageName) as
    | PageNode
    | undefined;

  if (!targetPage) {
    targetPage = figma.createPage();
    targetPage.name = pageName;
    post("PAGE_CREATED", { message: MESSAGES.PROCESS.PAGE_CREATED(pageName) });
  } else {
    post("PAGE_SWITCHED", {
      message: MESSAGES.PROCESS.PAGE_SWITCHED(pageName),
    });
  }
  await figma.setCurrentPageAsync(targetPage);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let removedCount = 0;
  const missingTranslations: { category: string; countryCode: string }[] = [];

  const horizontalGap = 40;
  const verticalGap = 80;

  const countryKeys = Object.keys(data);

  const expectedFrameNames = new Set<string>();

  // Outer loop: Categories (Columns)
  for (let catIndex = 0; catIndex < numCategories; catIndex++) {
    const categoryName = spreadsheetColumns[catIndex];
    const columnX = catIndex * (tileWidth + horizontalGap);

    // Inner loop: Countries (Rows)
    let currentY = 0;
    console.log("data", data);
    for (let i = 0; i < numCountries; i++) {
      const numericKey = countryKeys[i];
      const realSlug = countrySlugs[i] || numericKey;

      const row = data[numericKey] || [];
      const translation = row[catIndex] || "";

      const processedCount = catIndex * numCountries + i + 1;

      post("COUNTRY_PROCESSING", {
        message: `Processing ${realSlug} → ${categoryName} (${processedCount}/${totalTiles})`,
        currentCountry: realSlug,
        progress: Math.round((processedCount / totalTiles) * 100),
      });

      // Unique frame name: e.g. "at-sofas"
      const cleanCategory = categoryName
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_")
        .replace(/^-|-$|_$/g, "");
      const frameName = `${realSlug.toLowerCase()}_${cleanCategory}`;

      expectedFrameNames.add(frameName);

      let frame = targetPage.children.find(
        (n) => n.name === frameName && n.type === "FRAME",
      ) as FrameNode | undefined;

      const lines = [translation];
      const newSignature = computeSignature(lines, settings);

      const existed = !!frame;
      if (frame) {
        const previousSignature = frame.getPluginData("signature");
        if (previousSignature === newSignature) {
          skippedCount++;
          frame.x = columnX;
          frame.y = currentY;
          continue;
        }
      } else {
        frame = figma.createFrame();
        frame.name = frameName;
      }

      // Fixed size + centered text
      frame.resize(tileWidth, tileHeight);
      frame.layoutMode = "VERTICAL";
      frame.counterAxisSizingMode = "FIXED";
      frame.primaryAxisSizingMode = "FIXED";
      frame.fills = [solidPaint(backgroundColor)];

      const textHeight = asInt(lineHeight, 30);
      const dynamicPadding = Math.max(
        8,
        Math.floor((tileHeight - textHeight) / 2),
      );

      frame.paddingTop = dynamicPadding;
      frame.paddingBottom = dynamicPadding;
      frame.paddingLeft = 20;
      frame.paddingRight = 20;

      frame.counterAxisAlignItems = "CENTER";
      frame.primaryAxisAlignItems = "CENTER";

      frame.x = columnX;
      frame.y = currentY;

      const exportSettings: ExportSettings[] = [{ format: "PNG" }];
      frame.exportSettings = exportSettings;

      const existingTextNodes = frame.children.filter(
        (n) => n.type === "TEXT",
      ) as TextNode[];

      let desiredContent = translation.trim()
        ? translation
        : `${realSlug} - Missing ${categoryName}`;

      let desiredLines = [{ content: desiredContent }];

      if (existingTextNodes.length > 1) {
        existingTextNodes.slice(1).forEach((n) => n.remove());
      }

      const mainFont = { family: "Poppins", style: fontWeight } as FontName;

      if (existingTextNodes[0]) {
        const node = existingTextNodes[0];
        if (node.characters !== desiredContent) {
          await ensureFont(mainFont.family, mainFont.style);
          node.fontName = mainFont;
          node.characters = desiredContent;
          node.fontSize = asInt(fontSize, 30);
          node.lineHeight = { value: asInt(lineHeight, 30), unit: "PIXELS" };
          node.fills = [solidPaint(textColor)];
        }
      } else {
        const ln = await buildTextNode({
          content: desiredContent,
          baseFont: mainFont,
          fontSize: asInt(fontSize, 30),
          lineHeight: { value: asInt(lineHeight, 30), unit: "PIXELS" },
          fill: textColor,
        });
        frame.appendChild(ln);
        ln.layoutAlign = "STRETCH";
        ln.layoutSizingHorizontal = "FILL";
      }

      frame.setPluginData("signature", newSignature);
      targetPage.appendChild(frame);

      if (existed) updatedCount++;
      else createdCount++;

      currentY += tileHeight + verticalGap;
    }
  }

  post("CLEANUP_STARTED", { message: "Removing orphaned frames..." });

  const framesToRemove: FrameNode[] = [];
  targetPage.children.forEach((child) => {
    if (child.type === "FRAME" && !expectedFrameNames.has(child.name)) {
      framesToRemove.push(child as FrameNode);
    }
  });

  framesToRemove.forEach((frame) => {
    frame.remove();
    removedCount++;
  });

  if (removedCount > 0) {
    post("FRAMES_REMOVED", {
      message: `Removed ${removedCount} orphaned frames`,
      framesRemoved: removedCount,
    });
  }

  const summary = MESSAGES.PROCESS.PROCESSING_COMPLETE(
    createdCount,
    missingTranslations.length,
    missingTranslations.map((mt) => `${mt.countryCode} (${mt.category})`),
    updatedCount,
    skippedCount,
    removedCount,
  );

  post("FRAMES_CREATED", {
    message: summary,
    framesCount: createdCount,
    framesUpdated: updatedCount,
    framesSkipped: skippedCount,
    framesRemoved: removedCount,
    missingTranslations,
    totalProcessed: totalTiles,
  });
};
