import { FormSettings } from "./config/defaultFormSettings";
import { MESSAGES } from "./config/messages";

const solidPaint = figma.utils.solidPaint;

const post = (type: string, extra: Record<string, any> = {}) =>
  figma.ui.postMessage({ type, ...extra });

const hasText = (value: string) => !!value && value.trim().length > 0;

const ensureFont = async (family: string, style: string) => {
  const font: FontName = { family, style }
  await figma.loadFontAsync(font)
  return font
}

const buildTextNode = async ({content, baseFont, fontSize, lineHeight, fill}: {content: string, baseFont: FontName, fontSize: number, lineHeight: {value: number; unit: "PIXELS" | "PERCENT"}, fill: string}) => {
  const node = figma.createText();
  await ensureFont(baseFont.family, baseFont.style);
  node.fontName = baseFont;
  node.characters = content;
  node.fontSize = fontSize;
  node.textAlignHorizontal = "CENTER";
  node.leadingTrim = "CAP_HEIGHT";
  node.lineHeight = {value: lineHeight.value, unit: "PIXELS"};
  node.fills = [solidPaint(fill)];
  return node;
}

const computeSignature = (lines: string[], s: FormSettings) => {
  JSON.stringify([
    lines,
    s.width,
    s.height,
    s.backgroundColor,
    s.textColor,
    s.fontSize,
    s.lineHeight,
    s.fontWeight,
    s.spreadsheetColumns,
    s.autoSaveProfiles
  ])
}


export const handleFrameCreation = async (
  data: Record<string, string[]>,
  settings: FormSettings,
  pageName: string
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
  autoSaveProfiles
  } = settings;

  const totalCountries = Object.keys(data).length;
  post("FRAME_PROCESSING_STARTED", {
    message: MESSAGES.PROCESS.FRAME_PROCESSING_STARTED(totalCountries),
    totalCount: totalCountries
  })

  let targetPage = figma.root.children.find(p => p.name === pageName) as PageNode | undefined;
  if (!targetPage) {
    targetPage = figma.createPage();
    targetPage.name = pageName;
    post("PAGE_CREATED", {message: MESSAGES.PROCESS.PAGE_CREATED(pageName)})
  } else {
    post ("PAGE_SWITCHED", {message: MESSAGES.PROCESS.PAGE_SWITCHED(pageName)})
  }
  await figma.setCurrentPageAsync(targetPage);

  let currentY = 0
  let processedCount = 0
  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0

  const missingTranslations: {category: string, countryCode: string}[] = []

  for (const countryCode in data) {
    processedCount++;
    const row = data[countryCode]
    const lines = [row[0] || "", row[1] || ""]

    post("COUNTRY_PROCESSING", {
      message: MESSAGES.PROCESS.COUNTRY_PROCESSING(countryCode, processedCount, totalCountries),
      currentCountry: countryCode,
      progress: Math.round((processedCount / totalCountries) * 100)
    })

    const frameName = countryCode.toLowerCase()
    let frame = targetPage.children.find(
      (n) => n.name === frameName && n.type === "FRAME"
    ) as FrameNode | undefined;

    const newSignature = computeSignature(lines, settings);

    const existed = !!frame;
    if (frame) {
      const previousSignature = frame.getPluginData("signature");
      if(previousSignature === newSignature) {
        skippedCount++;
        post("FRAME_UNCHANGED", {
          message: MESSAGES.PROCESS.FRAME_UNCHANGED(countryCode),
          country: countryCode
        }
        )
        currentY = frame.y + frame.height + 128
        continue;
      }
    } else {
      frame = figma.createFrame();
      frame.name = frameName;
    }

    const exportSettings: ExportSettings[] = [
      {
        format: "PNG",
      }
    ]

    frame.exportSettings = exportSettings;

    frame.resize(width, height);
    frame.layoutMode = "VERTICAL";
    frame.counterAxisSizingMode = "FIXED";
    frame.primaryAxisSizingMode= "AUTO";
    frame.fills = [solidPaint(backgroundColor)];
    frame.paddingTop = 5;
    frame.paddingBottom = 5;
    frame.paddingLeft = 20;
    frame.paddingRight = 20;
    frame.counterAxisAlignItems = "CENTER";
    frame.primaryAxisAlignItems = "CENTER";
    frame.x = 0
    frame.y = currentY

    const existingTextNodes = frame.children.filter(n => n.type === "TEXT") as TextNode[];

    let desiredLines: {content: string}[] = 
    [
      {content: lines[0]},
    ].filter(l => hasText(l.content));

    if (desiredLines.length === 0) {
      missingTranslations.push({category: "Country Name", countryCode});

      post("MISSING_TRANSLATION", 
        {
          message: MESSAGES.PROCESS.MISSING_TRANSLATION(countryCode, "Country Name"),
          country: countryCode,
          category: "Country Name"
        }
      )

      desiredLines = [
        {
          content: `${countryCode} - Missing translation for Category`,
        }
      ]
    }

    if (existingTextNodes.length > desiredLines.length) {
      existingTextNodes.slice(desiredLines.length).forEach(n => n.remove());
    }

    for (let i = 0; i < desiredLines.length; i++) {
      const {content} = desiredLines[i]

      const mainFont = {family: "Popping", style: fontWeight} as FontName

      const maybeExisting = existingTextNodes[i]
      if(maybeExisting) {
        if (maybeExisting.characters !== content) {
          await ensureFont(mainFont.family, mainFont.style);
          maybeExisting.fontName = mainFont;
          maybeExisting.characters = content;
          maybeExisting.fontSize = fontSize;
          maybeExisting.lineHeight = {value: asInt(lineHeight, 30), unit: "PIXELS"};
          maybeExisting.fills = [solidPaint(textColor)];
        }
      } else {
        const ln = await buildTextNode({
          content,
          baseFont: mainFont,
          fontSize: asInt(fontSize, 30),
          lineHeight: {value: asInt(lineHeight, 30), unit: "PIXELS"},
          fill: textColor
      })
      frame.appendChild(ln);

      ln.layoutAlign = "STRETCH"
      ln.layoutSizingHorizontal = "FILL"
    }}

    frame.setPluginData("signature", newSignature);

    targetPage.appendChild(frame)
    if (existed) {
      updatedCount++
      post("FRAME_CREATED", {
        message: MESSAGES.PROCESS.FRAME_UPDATED(countryCode),
        country: countryCode
      })
    } else {
      createdCount++;
      post("FRAME_CREATED", 
        {
          message: MESSAGES.PROCESS.FRAME_CREATED(countryCode),
          country: countryCode
        }
      )
    }
    currentY = frame.y + frame.height + 128;
  }

  const summary = MESSAGES.PROCESS.PROCESSING_COMPLETE(
    createdCount,
    missingTranslations.length,
    missingTranslations.map(mt => `${mt.countryCode} (${mt.category})`),
    updatedCount,
    skippedCount
  )
  post("FRAMES_CREATED", {
    message: summary,
    framesCount: createdCount,
    framesUpdated: updatedCount,
    framesSkipped: skippedCount,
    missingTranslations,
    totalProcessed: processedCount
  })
}