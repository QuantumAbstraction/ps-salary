import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";
import { scrapeAll, URLS } from "../../scrape";

type SalaryEntry = {
  "annual-rates-of-pay": Array<{
    "effective-date": string;
    [key: string]: string | number;
  }>;
};

type SalaryData = Record<string, SalaryEntry>;

type GroupSummary = {
  group: string;
  total: number;
  codes: string[];
};

const buildGroupSummary = (data: SalaryData): GroupSummary[] => {
  const summary = new Map<string, Set<string>>();

  for (const rawCode of Object.keys(data)) {
    if (!rawCode) continue;

    const normalized = rawCode.toUpperCase();
    const match = normalized.match(/^[A-Z]+/);
    const group = match ? match[0] : normalized;

    if (!summary.has(group)) {
      summary.set(group, new Set());
    }

    summary.get(group)!.add(normalized);
  }

  return Array.from(summary.entries())
    .map(([group, codes]) => ({
      group,
      total: codes.size,
      codes: Array.from(codes).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("[scraper] Starting canonical scraper run");

    const scraped = await scrapeAll(URLS);
    const processedCount = Object.keys(scraped).length;
    console.log(`[scraper] Parsed ${processedCount} classifications from source pages`);

    const dataPath = path.join(process.cwd(), "data", "data.json");

    let existingData: SalaryData = {};
    try {
      const raw = await fs.readFile(dataPath, "utf8");
      existingData = raw ? (JSON.parse(raw) as SalaryData) : {};
    } catch (readError) {
      console.warn("[scraper] Existing data could not be read. A new data.json will be created.");
      existingData = {};
    }

    const existingKeySet = new Set(
      Object.keys(existingData).map((code) => code.toUpperCase())
    );
    const newCodes = Object.keys(scraped).filter(
      (code) => !existingKeySet.has(code.toUpperCase())
    );

    const mergedData: SalaryData = { ...existingData, ...scraped };
    const persistedTotal = Object.keys(mergedData).length;
    const updatedAt = new Date().toISOString();

    await fs.writeFile(dataPath, JSON.stringify(mergedData, null, 2), "utf8");
    console.log(`[scraper] data.json updated at ${updatedAt}. Persisted total: ${persistedTotal}. New classifications: ${newCodes.length}.`);

    const groupSummary = buildGroupSummary(mergedData);

    return res.status(200).json({
      success: true,
      message: `Scraper run completed at ${updatedAt}`,
      processedClassifications: processedCount,
      newClassifications: newCodes.length,
      newCodes,
      persistedTotal,
      updatedAt,
      data: scraped,
      groupSummary,
    });
  } catch (error) {
    console.error("[scraper] Scraper error", error);
    return res.status(500).json({
      error: "Scraping failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
