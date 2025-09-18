// scrape.ts
// Purpose: Fetch each Treasury Board "Rates of pay" page, scan the whole page
//          for Appendix A / Rates of pay sections, parse tables into JSON,
//          and save data.json.
//
// Run (dev):
//   npm install
//   npm run start
//
// Build + run JS:
//   npm run build
//   npm run run:js
//
// Output:
//   ./data.json

import { load } from "cheerio";
import * as fs from "fs/promises";

/* ---------------- configuration ---------------- */

const OUTPUT_JSON = "data/data.json";
const POLITE_DELAY_MS = 300;

// Paste the full list of URLs here. These should be the "rates" pages or main
// collective agreement pages. Fragments are ignored; the whole page is parsed.
const URLS: string[] = [
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ai.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ao.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/cp.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ct.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/cx.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/eb.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ec.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/el.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/fb.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/fs.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/it.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/lp.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/nr.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/pa.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/po.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/re.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/rm.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ro.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sh.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/so.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sp.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/src.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sre.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/srw.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sv.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/tc.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/tr.html",
  "https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ut.html",
];

/* ---------------- types ---------------- */

type RatesEntry = {
  "effective-date": string | null;
  [k: `step-${number}`]: number | string;
  group?: string | null;
  level?: string | null;
};

type SalaryData = {
  [classification: string]: {
    "annual-rates-of-pay": RatesEntry[];
  };
};

/* ---------------- small utilities ---------------- */

const log = (msg: string) => {
  const t = new Date().toISOString();
  console.log(`[${t}] ${msg}`);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

const parseMoney = (s: string) => {
  const n = s.replace(/[^\d.]/g, "");
  return n ? Number(n) : NaN;
};

const parseRange = (s: string): [number, number] | null => {
  if (!s || !s.trim()) return null;
  // common separators: to, -, –, —
  const txt = s.replace(/\u2013|\u2014/g, "-").replace(/\s+to\s+/i, " - ");
  const m = txt.match(/([\d,\.]+)\s*[-]\s*([\d,\.]+)/);
  if (!m) return null;
  const a = Number(m[1].replace(/[^\d.]/g, ""));
  const b = Number(m[2].replace(/[^\d.]/g, ""));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return [a, b];
};

const looksMoney = (s: string) => /\$?\s*\d[\d,]*(\.\d{2})?/.test(s);

const firstClassificationIn = (s: string) => {
  // Try to extract common classification codes that appear in headings.
  // Examples we want to match:
  //  - "AI, Air Traffic Control" -> "AI"
  //  - "CS-01" -> "CS-01"
  //  - "NU-CHN-03" -> "NU-CHN-03"
  const txt = clean(s || "");

  const patterns: RegExp[] = [
    // Pattern: ABC-DEF-12 or ABC-12 (letters groups with trailing digits)
    /\b([A-Z]{1,4}(?:-[A-Z]{2,4})*-\d{1,3})\b/,
    // Pattern: AS-02, CS-01 (letters + hyphen + digits)
    /\b([A-Z]{1,4}-\d{1,3})\b/,
    // Pattern: short alpha codes like AI, GS (2-4 uppercase letters)
    /\b([A-Z]{2,4})\b/,
  ];

  for (const re of patterns) {
    const m = txt.match(re);
    if (!m || !m[1]) continue;
    const cand = m[1].replace(/[,:;.]$/g, "");
    // Ignore single-letter Appendix markers like "A" and common words
    if (/^[A-Z]$/.test(cand)) continue;
    if (/^appendix$/i.test(cand)) continue;
    return cand;
  }
  return null;
};

function dedupe<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

/* ---------------- HTML helpers ---------------- */

function simpleTable($: any, $table: any) {
  let headers: string[] = [];

  const $thead = $table.find("thead");
  if ($thead.length) {
    headers = $thead
      .find("tr")
      .first()
      .find("th,td")
      .map((_: number, el: any) => clean($(el).text()))
      .get();
  } else {
    const $firstRow = $table.find("tr").first();
    const ths = $firstRow.find("th");
    headers = ths.length
      ? ths.map((_: number, el: any) => clean($(el).text())).get()
      : $firstRow
          .find("td")
          .map((i: number) => `Column ${i + 1}`)
          .get();
  }

  const rows: string[][] = [];
  const $bodyRows = $table.find("tbody tr");
  const src = $bodyRows.length ? $bodyRows : $table.find("tr").slice(1);
  src.each((_: number, tr: any) => {
    rows.push(
      $(tr)
        .find("th,td")
        .map((__: number, td: any) => clean($(td).text()))
        .get(),
    );
  });

  return { headers, rows };
}

const extractEffectiveDate = (text: string) => {
  const t = clean(text);
  // Match Month D, YYYY or Month D YYYY and pick the last occurrence in the text
  const re =
    /\b(?:effective(?:\s+date)?\s*[:\-]?\s*)?([A-Z][a-z]+ \d{1,2},? \d{4})\b/g;
  const matches = Array.from(t.matchAll(re));
  if (!matches.length) return null;
  return matches[matches.length - 1][1];
};

function tableToRatesBlocks($: any, $table: any): RatesEntry[] {
  const caption = clean($table.find("caption").first().text());
  const pageOrPrevText = clean($table.prev().text());
  const captionOrPrevEff =
    extractEffectiveDate(caption) ||
    extractEffectiveDate(pageOrPrevText) ||
    null;

  const { headers, rows } = simpleTable($, $table);
  if (!headers.length || !rows.length) return [];

  // Identify columns that look like steps and mark range columns.
  type StepCol = { idx: number; isRange: boolean };
  const stepCols: StepCol[] = [];
  headers.forEach((h, i) => {
    const t = (h || "").toLowerCase();
    // skip explicit effective date columns
    if (/effective/.test(t) || /effective date/.test(t) || /date/.test(t))
      return;
    // mark columns that explicitly mention range
    const isRangeHeader = /range/.test(t);
    if (
      /^(step(\s*\d+)?|\d+|rate\s*\d+|salary|pay|range)$/i.test(t) ||
      isRangeHeader
    ) {
      stepCols.push({ idx: i, isRange: isRangeHeader });
    }
  });
  if (!stepCols.length) {
    // fallback: use all columns except the first (commonly effective date)
    for (let i = 1; i < headers.length; i++)
      stepCols.push({ idx: i, isRange: /range/.test(headers[i]) });
  }

  const out: RatesEntry[] = [];

  // For each data row, try to extract an effective date from the first cell
  for (const row of rows) {
    const rowFirst = clean(row[0] ?? "");
    // prefer the full text (including label like "$)" or "A)" and any trailing notes)
    const dateRe = /[A-Z]?[)\w\s\-,:]*?\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/;
    let eff: string | null = null;
    if (dateRe.test(rowFirst)) {
      eff = rowFirst;
    } else if (caption && dateRe.test(caption)) {
      eff = caption;
    } else if (pageOrPrevText && dateRe.test(pageOrPrevText)) {
      eff = pageOrPrevText;
    } else {
      eff = null;
    }

    const entry: RatesEntry = { "effective-date": eff } as RatesEntry;
    let n = 1;
    for (const sc of stepCols) {
      const i = sc.idx;
      const cell = clean(row[i] ?? "");

      // If header or cell looks like a range, store as a single string into step-n
      const looksRange = sc.isRange || /\bto\b|\u2013|\u2014|\s-\s/.test(cell);
      if (looksRange) {
        // Preserve original formatting where possible
        entry[`step-${n}`] = cell;
        n++;
        continue;
      }

      const v = parseMoney(cell);
      if (!Number.isNaN(v)) {
        entry[`step-${n}`] = v;
        n++;
      }
    }

    if (Object.keys(entry).some((k) => /^step-\d+$/.test(k))) out.push(entry);
  }

  return out;
}

const headingLevel = ($el: any) => {
  const tag = ($el.prop("tagName") || "").toString().toLowerCase();
  const m = tag.match(/^h([1-6])$/);
  return m ? Number(m[1]) : null;
};

function collectUntilNextHeading($: any, $start: any) {
  const out: any[] = [];
  if (!$start.length) return out;
  const startLevel = headingLevel($start) ?? 6;
  let $cur = $start.next();
  while ($cur && $cur.length) {
    const lvl = headingLevel($cur);
    if (lvl && lvl <= startLevel) break;
    out.push($cur.get(0));
    $cur = $cur.next();
  }
  return out;
}

function findAppendixOrRatesStarts($: any) {
  // Return possible starting headings for Appendix A or Rates of pay
  const all = $("h1,h2,h3,h4,h5,h6")
    .toArray()
    .map((e: any) => $(e));
  return all.filter(($h: any) => {
    const t = clean($h.text()).toLowerCase();
    return (
      /appendix\s*a\b/.test(t) ||
      /\brates of pay\b/.test(t) ||
      /\brates\b/.test(t)
    );
  });
}

function parseAppendixInNodes($: any, nodes: any[]) {
  const out: SalaryData = {};
  let currentClass: string | null = null;

  for (const node of nodes) {
    const $el = $(node);
    const tag = ($el.prop("tagName") || "").toString().toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const maybe = firstClassificationIn(clean($el.text()));
      if (maybe) {
        currentClass = maybe;
        if (!out[currentClass])
          out[currentClass] = { "annual-rates-of-pay": [] };
      }
      continue;
    }

    // Try to find tables in this node. If a table caption contains a
    // classification (e.g. "AI-01: annual rates of pay"), prefer that.
    const tables = $el.is("table")
      ? [$el]
      : $el
          .find("table")
          .toArray()
          .map((e: any) => $(e));

    for (const $t of tables) {
      // Attempt to extract classification from the table caption first.
      const captionText = clean($t.find("caption").first().text());
      const fromCaption = firstClassificationIn(captionText ?? "") ?? null;
      const useClass = fromCaption ?? currentClass;
      if (!useClass) continue;

      if (!out[useClass]) out[useClass] = { "annual-rates-of-pay": [] };

      const blocks = tableToRatesBlocks($, $t);
      if (!blocks.length) continue;

      for (const block of blocks) {
        // Attach group/level when possible: AI-01 -> group: AI, level: 01
        const m = (fromCaption ?? useClass).match(
          /^([A-Z]{1,4})(?:-(\d{1,3}))?$/,
        );
        if (m) {
          block.group = m[1];
          block.level = m[2] ?? null;
        } else {
          // fallback: try to capture leading alpha sequence
          const mm = (fromCaption ?? useClass).match(/^([A-Z]{2,4})/);
          if (mm) block.group = mm[1];
        }

        out[useClass]["annual-rates-of-pay"].push(block);
      }
    }
  }

  // de-duplicate entries
  for (const k of Object.keys(out)) {
    const seen = new Set<string>();
    const arr = out[k]["annual-rates-of-pay"];
    // Keep the last entry for duplicate effective-date. We'll iterate from
    // the end, record seen dates, and then reverse to preserve original order
    const rev: any[] = [];
    const seenDates = new Set<string>();
    for (let i = arr.length - 1; i >= 0; i--) {
      const d = String(arr[i]["effective-date"] ?? "").trim();
      if (d && !seenDates.has(d)) {
        seenDates.add(d);
        rev.push(arr[i]);
      }
    }
    out[k]["annual-rates-of-pay"] = rev.reverse();
  }

  return out;
}

function mergeData(a: SalaryData, b: SalaryData) {
  for (const k of Object.keys(b)) {
    if (!a[k]) a[k] = { "annual-rates-of-pay": [] };
    a[k]["annual-rates-of-pay"].push(...b[k]["annual-rates-of-pay"]);
  }
}

function sortSteps(entry: RatesEntry): RatesEntry {
  const { ["effective-date"]: eff, ...rest } = entry;
  // steps may be numeric or string (e.g. ranges). Preserve strings.
  const steps: Array<[number, number | string]> = Object.entries(rest)
    .filter(([k]) => /^step-\d+$/.test(k))
    .map(([k, v]) => {
      const idx = Number(k.split("-")[1]);
      // preserve original string values (ranges) and numeric values as numbers
      if (typeof v === "string") return [idx, v];
      return [idx, Number(v)];
    });
  steps.sort((x, y) => x[0] - y[0]);

  const out: RatesEntry = { "effective-date": eff ?? null } as RatesEntry;
  for (const [n, v] of steps) out[`step-${n}`] = v;
  return out;
}

/* ---------------- core scrape ---------------- */

async function fetchPage(url: string): Promise<string> {
  log(`Fetching: ${url}`);
  const r = await fetch(url, {
    headers: { "User-Agent": "VAC scraper (respectful fetch)" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const html = await r.text();
  await sleep(POLITE_DELAY_MS);
  return html;
}

async function scrapeAppendixAFromPage(url: string): Promise<SalaryData> {
  const html = await fetchPage(url);
  const $ = load(html);
  return parseAppendixFromDocument($);
}

function parseAppendixFromDocument($: any): SalaryData {
  const starts = findAppendixOrRatesStarts($);
  if (!starts.length) return {};

  const result: SalaryData = {};

  for (const $start of starts) {
    const $section = $start.closest("section.pdf-section");

    // Collect tables from the section and from the sibling traversal
    const tables: any[] = [];
    const seenTables = new Set<any>();

    if ($section && $section.length) {
      $section
        .find("table")
        .toArray()
        .forEach((t: any) => {
          if (!seenTables.has(t)) {
            seenTables.add(t);
            tables.push($(t));
          }
        });
    }

    const nodes = collectUntilNextHeading($, $start);
    for (const n of nodes) {
      const $n = $(n);
      $n.find("table")
        .toArray()
        .forEach((t: any) => {
          if (!seenTables.has(t)) {
            seenTables.add(t);
            tables.push($(t));
          }
        });
      // also if the node itself is a table
      if ($n.is("table") && !seenTables.has($n.get(0))) {
        seenTables.add($n.get(0));
        tables.push($n as any);
      }
    }

    // Process each table explicitly
    for (const $t of tables) {
      const captionText = clean($t.find("caption").first().text());
      const fromCaption = firstClassificationIn(captionText ?? "") ?? null;

      // Try to find nearest previous heading to this table for classification
      let useClass: string | null = fromCaption;
      if (!useClass) {
        const $prevHeading = $t.prevAll("h1,h2,h3,h4,h5,h6").first();
        if ($prevHeading && $prevHeading.length) {
          useClass = firstClassificationIn(clean($prevHeading.text())) ?? null;
        }
      }
      // Fallback to the start heading classification
      if (!useClass)
        useClass = firstClassificationIn(clean($start.text())) ?? null;
      if (!useClass) continue;

      if (!result[useClass]) result[useClass] = { "annual-rates-of-pay": [] };

      const blocks = tableToRatesBlocks($, $t);
      for (const block of blocks) {
        const m = (fromCaption ?? useClass).match(
          /^([A-Z]{1,4})(?:-(\d{1,3}))?$/,
        );
        if (m) {
          block.group = m[1];
          block.level = m[2] ?? null;
        } else {
          const mm = (fromCaption ?? useClass).match(/^([A-Z]{2,4})/);
          if (mm) block.group = mm[1];
        }
        result[useClass]["annual-rates-of-pay"].push(block);
      }
    }
  }

  // Merge/sort/dedupe similar to previous behavior
  for (const k of Object.keys(result)) {
    result[k]["annual-rates-of-pay"] = dedupe(
      result[k]["annual-rates-of-pay"].map(sortSteps),
      (x) => JSON.stringify(x),
    );
  }

  // Keep last occurrence per effective-date
  for (const k of Object.keys(result)) {
    const arr = result[k]["annual-rates-of-pay"];
    const rev: any[] = [];
    const seenDates = new Set<string>();
    for (let i = arr.length - 1; i >= 0; i--) {
      const d = String(arr[i]["effective-date"] ?? "").trim();
      if (d && !seenDates.has(d)) {
        seenDates.add(d);
        rev.push(arr[i]);
      }
    }
    result[k]["annual-rates-of-pay"] = rev.reverse();
  }

  return result;
}

async function scrapeAll(urls: string[]): Promise<SalaryData> {
  const result: SalaryData = {};
  let ok = 0;
  for (const url of urls) {
    try {
      const pageData = await scrapeAppendixAFromPage(url);
      mergeData(result, pageData);
      ok++;
    } catch (e: unknown) {
      log(`FAIL ${url} -> ${(e as Error).message}`);
    }
  }
  log(
    `Parsed ${ok} of ${urls.length} pages. Classifications: ${Object.keys(result).length}.`,
  );
  return result;
}

/* ---------------- entry point ---------------- */

async function main() {
  try {
    log("Starting scraper");
    const data = await scrapeAll(URLS);
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(data, null, 2), "utf-8");
    log(`Saved ${OUTPUT_JSON}`);
  } catch (e: unknown) {
    log(`Fatal error: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

// If NODE_LOCAL_TEST is set, allow parsing a local HTML file instead of fetching
// remote URLs. This is useful for quickly validating parsing against
// `sample.html` in the repo.
async function runLocalTestIfRequested() {
  if (process.env.NODE_LOCAL_TEST !== "1") return false;
  try {
    const localPath = process.env.NODE_LOCAL_FILE || "sample.html";
    log(`Local test: reading ${localPath}`);
    const html = await fs.readFile(localPath, "utf-8");
    const $ = load(html);
    const starts = findAppendixOrRatesStarts($);
    if (!starts.length) {
      log("WARN no Appendix A or Rates of pay headings found in local file");
      return true;
    }

    const parsedPerStart: any[] = [];
    for (const $start of starts) {
      const nodes = collectUntilNextHeading($, $start);
      parsedPerStart.push(parseAppendixInNodes($, nodes));
    }

    const merged: SalaryData = {};
    for (const chunk of parsedPerStart) mergeData(merged, chunk);
    for (const k of Object.keys(merged)) {
      merged[k]["annual-rates-of-pay"] = dedupe(
        merged[k]["annual-rates-of-pay"].map(sortSteps),
        (x) => JSON.stringify(x),
      );
    }

    console.log(JSON.stringify(merged, null, 2));
    return true;
  } catch (e: unknown) {
    log(`Local test failed: ${(e as Error).message}`);
    return true;
  }
}

// Run local test when requested, otherwise run normal main
(async () => {
  const didLocal = await runLocalTestIfRequested();
  if (!didLocal) await main();
})();

export { main, scrapeAppendixAFromPage, scrapeAll, URLS };
