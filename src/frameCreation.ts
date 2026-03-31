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

  // font size helpers
  const getTextClearance = (frame: FrameNode): number => {
    const textNodes = frame.children.filter(
      (n) => n.type === "TEXT",
    ) as TextNode[];
    if (textNodes.length === 0) return 0;
    const paddingVertical = frame.paddingTop + frame.paddingBottom;
    return frame.height - paddingVertical - textNodes[0].height;
  };

  const createOrUpdateTile = async ({
    targetPage,
    frameName,
    desiredContent,
    columnX,
    currentY,
    tileWidth,
    tileHeight,
    backgroundColor,
    textColor,
    usedFontSize,
    lineHeightValue,
    fontWeight,
    newSignature,
    forceUpdate = false,
  }: {
    targetPage: PageNode;
    frameName: string;
    desiredContent: string;
    columnX: number;
    currentY: number;
    tileWidth: number;
    tileHeight: number;
    backgroundColor: string;
    textColor: string;
    usedFontSize: number;
    lineHeightValue: number;
    fontWeight: string;
    newSignature: string;
    forceUpdate?: boolean;
  }) => {
    let frame = targetPage.children.find(
      (n) => n.name === frameName && n.type === "FRAME",
    ) as FrameNode | undefined;
    const existed = !!frame;

    if (frame) {
      const previousSignature = frame.getPluginData("signature");
      if (!forceUpdate &&previousSignature === newSignature) {
       skippedCount++;
        frame.x = columnX;
        frame.y = currentY;
        return;
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

    const mainFont = { family: "Poppins", style: fontWeight } as FontName;
    const existingTextNodes = frame.children.filter(
      (n) => n.type === "TEXT",
    ) as TextNode[];

    if (existingTextNodes[0]) {
      const node = existingTextNodes[0];
      if (node.characters !== desiredContent || forceUpdate || node.fontSize !== usedFontSize || node.lineHeight.value !== lineHeightValue || node.fills[0].color !== solidPaint(textColor).color) {
        await ensureFont(mainFont.family, mainFont.style);
        node.fontName = mainFont;
        node.characters = desiredContent;
        node.fontSize = usedFontSize;
        node.lineHeight = { value: lineHeightValue, unit: "PIXELS" };
        node.fills = [solidPaint(textColor)];
      }
    } else {
      const textNode = await buildTextNode({
        content: desiredContent,
        baseFont: mainFont,
        fontSize: usedFontSize,
        lineHeight: { value: lineHeightValue, unit: "PIXELS" },
        fill: textColor,
      });
      frame.appendChild(textNode);
      textNode.layoutAlign = "STRETCH";
      textNode.layoutSizingHorizontal = "FILL";
    }

    frame.setPluginData("signature", newSignature);
    targetPage.appendChild(frame);

    if (existed) updatedCount++;
    else createdCount++;
  };

  // adaptive font sizes (one per country)
  const baseFontSize = asInt(fontSize, 30);
  const countryFontSizes = new Map<string, number>();
  countrySlugs.forEach((slug) => {
    countryFontSizes.set(slug.toLowerCase(), baseFontSize);
  });

  // initial creation (all tiles)

  for (let countryIndex = 0; countryIndex < numCountries; countryIndex++) {
    const realSlug = countrySlugs[countryIndex];
    const numericKey = countryKeys[countryIndex];
    const columnX = countryIndex * (tileWidth + horizontalGap);
    let currentY = 0;

    // Outer loop: Categories (Columns)
    for (let catIndex = 0; catIndex < numCategories; catIndex++) {
      const categoryName = spreadsheetColumns[catIndex];
      const row = data[numericKey] || [];
      const translation = row[catIndex] || "";

      const processedCount = countryIndex * numCategories + catIndex + 1;

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

      let desiredContent = translation.trim()
        ? translation
        : `${realSlug} - Missing ${categoryName}`;

      const usedFontSize =
        countryFontSizes.get(realSlug.toLowerCase())!

      const newSignature = computeSignature([translation], settings);

      await createOrUpdateTile({
        targetPage,
        frameName,
        desiredContent,
        columnX,
        currentY,
        tileWidth,
        tileHeight,
        backgroundColor,
        textColor,
        usedFontSize,
        lineHeightValue: asInt(lineHeight, 30),
        fontWeight,
        newSignature,
        forceUpdate: false,
      });

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

  // adaptive font reduction phase
  post("FRAME_PROCESSING_STARTED", {
    message: "Checking text fit and adjusting fonts per language...",
  });

  let iteration = 0;
  const MAX_ITERATIONS = 10;
  const FONT_STEP = 2;
  let adjusted = true;

  while (adjusted && iteration < MAX_ITERATIONS) {
    adjusted = false;
    iteration++;

    const problematicCountries = new Set<string>();

    targetPage.children.forEach((child) => {
      if (child.type !== "FRAME") return;
      const frame = child as FrameNode;
      const countrySlug = frame.name.split("_")[0].toLowerCase();

      if (countrySlugs.some((s) => s.toLowerCase() === countrySlug)) {
        if (getTextClearance(frame) < 3) {
          problematicCountries.add(countrySlug);
        }
      }
    });

    if (problematicCountries.size === 0) break;

    adjusted = true;

    for (const countrySlug of problematicCountries) {
      let currentFs = countryFontSizes.get(countrySlug)!;
      const newFs = Math.max(10, currentFs - FONT_STEP);

      if (newFs >= currentFs) continue;
      countryFontSizes.set(countrySlug, newFs);

      post("COUNTRY_PROCESSING", {
        message: `Reducing font for ${countrySlug.toUpperCase()} to ${newFs}px (iteration ${iteration})`,
      });

      const countryIndex = countrySlugs.findIndex(
        (s) => s.toLowerCase() === countrySlug,
      );
      if (countryIndex === -1) continue;

      const numericKey = countryKeys[countryIndex];
      const columnX = countryIndex * (tileWidth + horizontalGap);
      let currentY = 0;

      for (let catIndex = 0; catIndex < numCategories; catIndex++) {
        const categoryName = spreadsheetColumns[catIndex];
        const row = data[numericKey] || [];
        const translation = row[catIndex] || "";

        const cleanCategory = categoryName
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]/gi, "_")
          .replace(/_+/g, "_")
          .replace(/^-|-$|_$/g, "");

        const frameName = `${countrySlug}_${cleanCategory}`;

        const desiredContent = translation.trim()
          ? translation
          : `${countrySlug} - Missing ${categoryName}`;

        const newSignature = computeSignature([translation], settings);

        await createOrUpdateTile({
          targetPage,
          frameName,
          desiredContent,
          columnX,
          currentY,
          tileWidth,
          tileHeight,
          backgroundColor,
          textColor,
          usedFontSize: newFs,
          lineHeightValue: asInt(lineHeight, 30),
          fontWeight,
          newSignature,
          forceUpdate: true,
        });

        currentY += tileHeight + verticalGap;
      }
    }
  }

  if (iteration === MAX_ITERATIONS) {
    post("ERROR", { message: "Max font-adjustment iterations reached" });
  }

  const summary = MESSAGES.PROCESS.PROCESSING_COMPLETE(
    createdCount,
    missingTranslations.length,
    [],
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
