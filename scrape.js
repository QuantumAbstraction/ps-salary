"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLS = exports.sortSalaryData = exports.parseAppendixFromDocument = exports.scrapeAll = exports.scrapeAppendixAFromPage = exports.main = void 0;
var cheerio_1 = require("cheerio");
var fs = __importStar(require("fs/promises"));
var ai_parser_1 = require("./lib/ai-parser");
/* ---------------- configuration ---------------- */
var OUTPUT_JSON = 'data/data.json';
var POLITE_DELAY_MS = 100;
// AI-assisted parsing configuration
var USE_AI_PARSING = process.env.USE_AI_PARSING === 'true';
var FORCE_AI = process.env.FORCE_AI === 'true'; // Always use AI (for testing)
// URLs that have complex table structures and should use AI parsing
var PROBLEMATIC_URLS = ['as.html', 'gl.html', '/ex.html', 'co-rcmp.html', 'sv.html', 'hp.html', 'hs.html'];
// Paste the full list of URLs here. These should be the "rates" pages or main
// collective agreement pages. Fragments are ignored; the whole page is parsed.
var URLS = [
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ai.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ao.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/cp.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ct.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/cx.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/eb.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ec.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/el.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/fb.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/fs.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/it.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/lp.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/nr.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/pa.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/po.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/re.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/rm.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ro.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sh.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/so.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sp.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/src.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sre.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/srw.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/sv.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/tc.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/tr.html',
    'https://www.canada.ca/en/treasury-board-secretariat/topics/pay/collective-agreements/ut.html',
    // Unrepresented senior excluded employees (managerial and confidential positions)
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/as.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ao.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/co-rcmp.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ct.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/cx.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ds.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ed.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ex.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/fr.html',
    // 'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/gt.html', // 404 - page doesn't exist
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/hr.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/is.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/lc.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/md.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/mt.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/nu.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/om.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pe.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pi.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pm.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/pg.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/sg.html',
    // 'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/sr-w.html', // 404 - page doesn't exist
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/so.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/tr.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/ut.html',
    'https://www.canada.ca/en/treasury-board-secretariat/services/pay/rates-pay/rates-pay-unrepresented-senior-excluded-employees/wp.html'
];
exports.URLS = URLS;
/* ---------------- small utilities ---------------- */
var log = function (msg) {
    var t = new Date().toISOString();
    console.log("[".concat(t, "] ").concat(msg));
};
var sleep = function (ms) { return new Promise(function (r) { return setTimeout(r, ms); }); };
var clean = function (s) {
    return String(s !== null && s !== void 0 ? s : '')
        // Normalize ALL dash variations to regular hyphen-minus (U+002D)
        // U+2010 Hyphen ‐
        // U+2011 Non-breaking hyphen ‑
        // U+2012 Figure dash ‒
        // U+2013 En dash –
        // U+2014 Em dash —
        // U+2015 Horizontal bar ―
        // U+2212 Minus sign −
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
};
var parseMoney = function (s) {
    var n = s.replace(/[^\d.]/g, '');
    return n ? Number(n) : NaN;
};
var parseRange = function (s) {
    if (!s || !s.trim())
        return null;
    var orig = s.trim();
    // Normalize ALL dash types to regular hyphen and spacey separators
    var txt = orig.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-').replace(/\s+to\s+/i, ' - ');
    // Try patterns in a conservative order.
    // 1) explicit numeric pairs: "12,345 - 23,456" or "12.3 - 23.4"
    var m1 = txt.match(/([\d,\.]+)\s*-\s*([\d,\.]+)/);
    if (m1) {
        var a = Number(m1[1].replace(/[^\d.]/g, ''));
        var b = Number(m1[2].replace(/[^\d.]/g, ''));
        if (!Number.isNaN(a) && !Number.isNaN(b))
            return [a, b];
    }
    // 2) word form: "from X to Y" or "X to Y"
    var m2 = txt.match(/from\s*([\d,\.]+)\s*to\s*([\d,\.]+)/i) || txt.match(/([\d,\.]+)\s*to\s*([\d,\.]+)/i);
    if (m2) {
        var a = Number(m2[1].replace(/[^\d.]/g, ''));
        var b = Number(m2[2].replace(/[^\d.]/g, ''));
        if (!Number.isNaN(a) && !Number.isNaN(b))
            return [a, b];
    }
    // 3) open-ended patterns: "X+" or "up to Y" -> treat as single-sided ranges
    var plus = txt.match(/([\d,\.]+)\s*\+/);
    if (plus) {
        var a = Number(plus[1].replace(/[^\d.]/g, ''));
        if (!Number.isNaN(a))
            return [a, a];
    }
    var upto = txt.match(/up to\s*([\d,\.]+)/i);
    if (upto) {
        var b = Number(upto[1].replace(/[^\d.]/g, ''));
        if (!Number.isNaN(b))
            return [b, b];
    }
    // 4) slash-separated like "X/Y" sometimes used -> pick both
    var slash = txt.match(/([\d,\.]+)\s*\/\s*([\d,\.]+)/);
    if (slash) {
        var a = Number(slash[1].replace(/[^\d.]/g, ''));
        var b = Number(slash[2].replace(/[^\d.]/g, ''));
        if (!Number.isNaN(a) && !Number.isNaN(b))
            return [a, b];
    }
    // Fallback: no reliable numeric pair found
    return null;
};
var looksMoney = function (s) { return /\$?\s*\d[\d,]*(\.\d{2})?/.test(s); };
var firstClassificationIn = function (s) {
    // Try to extract common classification codes that appear in headings.
    // Examples we want to match:
    //  - "AI, Air Traffic Control" -> "AI"
    //  - "CS-01" -> "CS-01"
    //  - "NU-CHN-03" -> "NU-CHN-03"
    //  - "AS‐1" (with various dashes) -> "AS-01"
    var txt = clean(s || '');
    // Special case: "AS – Development" or similar developmental rates
    // Only match if we explicitly see "Development" or "Developmental" with AS
    if (/\bAS\s*[-‐‑‒–—―]\s*Develop(ment|mental)\b/i.test(txt)) {
        return 'AS-DEV';
    }
    var patterns = [
        // Pattern: ABC-DEF-12 or ABC-12 (letters groups with trailing digits)
        /\b([A-Z]{1,4}(?:-[A-Z]{2,4})*-\d{1,3})\b/,
        // Pattern: AS-02, CS-01 (letters + hyphen + digits)
        /\b([A-Z]{1,4}-\d{1,3})\b/,
        // Pattern: short alpha codes like AI, GS (2-4 uppercase letters)
        /\b([A-Z]{2,4})\b/
    ];
    for (var _a = 0, patterns_1 = patterns; _a < patterns_1.length; _a++) {
        var re = patterns_1[_a];
        var m = txt.match(re);
        if (!m || !m[1])
            continue;
        var cand = m[1].replace(/[,:;.]$/g, '');
        // Ignore single-letter Appendix markers like "A" and common words
        if (/^[A-Z]$/.test(cand))
            continue;
        if (/^appendix$/i.test(cand))
            continue;
        // Normalize single-digit level codes to zero-padded format (AS-1 -> AS-01)
        cand = cand.replace(/^([A-Z]{2,4})-(\d)$/, function (match, letters, digit) {
            return "".concat(letters, "-0").concat(digit);
        });
        return cand;
    }
    return null;
};
function dedupe(arr, keyFn) {
    var seen = new Set();
    var out = [];
    for (var _a = 0, arr_1 = arr; _a < arr_1.length; _a++) {
        var x = arr_1[_a];
        var k = keyFn(x);
        if (seen.has(k))
            continue;
        seen.add(k);
        out.push(x);
    }
    return out;
}
function sortSalaryData(data) {
    // Sort classification codes alphabetically
    var sorted = {};
    var keys = Object.keys(data).sort(function (a, b) {
        // Sort alphabetically, case-insensitive
        return a.toUpperCase().localeCompare(b.toUpperCase());
    });
    for (var _a = 0, keys_1 = keys; _a < keys_1.length; _a++) {
        var key = keys_1[_a];
        sorted[key] = data[key];
    }
    return sorted;
}
exports.sortSalaryData = sortSalaryData;
/* ---------------- HTML helpers ---------------- */
function simpleTable($, $table) {
    var headers = [];
    var $thead = $table.find('thead');
    if ($thead.length) {
        headers = $thead
            .find('tr')
            .first()
            .find('th,td')
            .map(function (_, el) { return clean($(el).text()); })
            .get();
    }
    else {
        var $firstRow = $table.find('tr').first();
        var ths = $firstRow.find('th');
        headers = ths.length
            ? ths.map(function (_, el) { return clean($(el).text()); }).get()
            : $firstRow
                .find('td')
                .map(function (i) { return "Column ".concat(i + 1); })
                .get();
    }
    var rows = [];
    var $bodyRows = $table.find('tbody tr');
    var src = $bodyRows.length ? $bodyRows : $table.find('tr').slice(1);
    src.each(function (_, tr) {
        rows.push($(tr)
            .find('th,td')
            .map(function (__, td) { return clean($(td).text()); })
            .get());
    });
    return { headers: headers, rows: rows };
}
var extractEffectiveDate = function (text) {
    var t = clean(text);
    // Match Month D, YYYY or Month D YYYY and pick the last occurrence in the text
    var re = /\b(?:effective(?:\s+date)?\s*[:\-]?\s*)?([A-Z][a-z]+ \d{1,2},? \d{4})\b/g;
    var matches = Array.from(t.matchAll(re));
    if (!matches.length)
        return null;
    return matches[matches.length - 1][1];
};
function parseClassificationLegend($, contentNodes) {
    var legendMap = {};
    // Look through all content nodes for legend entries
    for (var _a = 0, contentNodes_1 = contentNodes; _a < contentNodes_1.length; _a++) {
        var node = contentNodes_1[_a];
        var $node = $(node);
        var text = $node.text();
        // Check if this node or its children contain "Table legend" or "legend"
        var hasLegendHeading = text.toLowerCase().includes('table legend') ||
            text.toLowerCase().includes('legend') ||
            $node.find('*').filter(function (_i, el) {
                return $(el).text().toLowerCase().includes('legend');
            }).length > 0;
        if (hasLegendHeading) {
            // Parse legend entries from this node and following nodes
            var currentNode = $node;
            var searchNodes = [$node];
            // Also check the next few sibling nodes for legend entries
            var nextSibling = $node.next();
            var count = 0;
            while (nextSibling.length && count < 10) {
                // Limit search to avoid going too far
                searchNodes.push(nextSibling);
                nextSibling = nextSibling.next();
                count++;
            }
            for (var _b = 0, searchNodes_1 = searchNodes; _b < searchNodes_1.length; _b++) {
                var $searchNode = searchNodes_1[_b];
                var nodeText = $searchNode.text();
                // Parse legend entries like "$) Effective June 21, 2020" or "A) Effective June 21, 2021"
                var legendEntries = nodeText.match(/([A-Z$])\)\s*Effective\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})[^\n\r]*/g);
                if (legendEntries) {
                    legendEntries.forEach(function (entry) {
                        var match = entry.match(/([A-Z$])\)\s*Effective\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/);
                        if (match) {
                            var symbol = match[1];
                            var date = match[2].replace(/,(\s+\d{4})/, '$1'); // Clean up comma formatting
                            legendMap[symbol] = date;
                        }
                    });
                }
            }
            // If we found legend entries, break out of the loop
            if (Object.keys(legendMap).length > 0) {
                break;
            }
        }
    }
    return legendMap;
}
function tableToRatesBlocks($, $table, sourceUrl, legendMap) {
    var _a, _b;
    if (legendMap === void 0) { legendMap = {}; }
    var caption = clean($table.find('caption').first().text());
    var pageOrPrevText = clean($table.prev().text());
    var captionOrPrevEff = extractEffectiveDate(caption) || extractEffectiveDate(pageOrPrevText) || null;
    var _c = simpleTable($, $table), headers = _c.headers, rows = _c.rows;
    if (!headers.length || !rows.length)
        return [];
    var stepCols = [];
    headers.forEach(function (h, i) {
        var t = (h || '').toLowerCase();
        // skip explicit effective date columns
        if (/effective/.test(t) || /effective date/.test(t) || /date/.test(t))
            return;
        // mark columns that explicitly mention range
        var isRangeHeader = /range/.test(t);
        if (/^(step(\s*\d+)?|\d+|rate\s*\d+|salary|pay|range)$/i.test(t) || isRangeHeader) {
            stepCols.push({ idx: i, isRange: isRangeHeader });
        }
    });
    if (!stepCols.length) {
        // fallback: use all columns except the first (commonly effective date)
        for (var i = 1; i < headers.length; i++)
            stepCols.push({ idx: i, isRange: /range/.test(headers[i]) });
    }
    var out = [];
    // NEW APPROACH: If we have legend mappings and headers that look like symbols,
    // create one entry per effective date with all salary steps
    if (Object.keys(legendMap).length > 0) {
        // Check if headers contain legend symbols
        var symbolHeaders = headers.filter(function (h, i) { return i > 0 && legendMap[clean(h)]; });
        if (symbolHeaders.length > 0) {
            // Process each symbol/effective date
            symbolHeaders.forEach(function (header, headerIdx) {
                var symbol = clean(header);
                var effectiveDate = legendMap[symbol];
                if (!effectiveDate)
                    return;
                var entry = { 'effective-date': effectiveDate };
                if (sourceUrl)
                    entry['_source'] = sourceUrl;
                // For each row, get the salary value from this column
                var stepNum = 1;
                rows.forEach(function (row, rowIdx) {
                    var _a;
                    var columnIdx = headerIdx + 1; // +1 because we filtered out first column
                    var cellValue = clean((_a = row[columnIdx]) !== null && _a !== void 0 ? _a : '');
                    if (cellValue) {
                        // Check if it's a range
                        var range = parseRange(cellValue);
                        if (range && range.length === 2) {
                            entry["step-".concat(stepNum)] = range[0];
                            entry["_raw-step-".concat(stepNum)] = cellValue;
                            entry["step-".concat(stepNum + 1)] = range[1];
                            entry["_raw-step-".concat(stepNum + 1)] = cellValue;
                            stepNum += 2;
                        }
                        else {
                            var v = parseMoney(cellValue);
                            if (!Number.isNaN(v)) {
                                entry["step-".concat(stepNum)] = v;
                                stepNum++;
                            }
                        }
                    }
                });
                if (Object.keys(entry).some(function (k) { return /^step-\d+$/.test(k); })) {
                    out.push(entry);
                }
            });
            return out;
        }
    }
    // FALLBACK: Original logic for non-legend tables
    // For each data row, try to extract an effective date from the first cell
    for (var _d = 0, rows_1 = rows; _d < rows_1.length; _d++) {
        var row = rows_1[_d];
        var rowFirst = clean((_a = row[0]) !== null && _a !== void 0 ? _a : '');
        // prefer the full text (including label like "$)" or "A)" and any trailing notes)
        var dateRe = /[A-Z]?[)\w\s\-,:]*?\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/;
        var eff = null;
        if (dateRe.test(rowFirst)) {
            eff = rowFirst;
        }
        else if (caption && dateRe.test(caption)) {
            eff = caption;
        }
        else if (pageOrPrevText && dateRe.test(pageOrPrevText)) {
            eff = pageOrPrevText;
        }
        else {
            eff = null;
        }
        var entry = { 'effective-date': eff };
        // record the source page for this block so consumers can trace origin
        if (sourceUrl)
            entry['_source'] = sourceUrl;
        var n = 1;
        for (var _e = 0, stepCols_1 = stepCols; _e < stepCols_1.length; _e++) {
            var sc = stepCols_1[_e];
            var i = sc.idx;
            var cell = clean((_b = row[i]) !== null && _b !== void 0 ? _b : '');
            // If header or cell looks like a range, try to split into min/max steps
            var looksRange = sc.isRange || /\bto\b|\u2013|\u2014|\s-\s|\+/.test(cell);
            if (looksRange) {
                // Try to parse the numeric range (e.g. "50,000 - 60,000")
                var range = parseRange(cell);
                if (range && range.length === 2) {
                    // map min -> step-n, max -> step-(n+1)
                    entry["step-".concat(n)] = range[0];
                    entry["_raw-step-".concat(n)] = cell;
                    entry["step-".concat(n + 1)] = range[1];
                    entry["_raw-step-".concat(n + 1)] = cell;
                    n += 2;
                    continue;
                }
                // Fallback: preserve original formatting where possible
                entry["step-".concat(n)] = cell;
                n++;
                continue;
            }
            var v = parseMoney(cell);
            if (!Number.isNaN(v)) {
                entry["step-".concat(n)] = v;
                n++;
            }
        }
        if (Object.keys(entry).some(function (k) { return /^step-\d+$/.test(k); }))
            out.push(entry);
    }
    return out;
}
function tableToRatesBlocksWithRows($, $table, filteredRows, sourceUrl, legendMap) {
    if (legendMap === void 0) { legendMap = {}; }
    var headers = simpleTable($, $table).headers;
    // Use filtered rows instead of all table rows
    var rows = filteredRows;
    var caption = clean($table.find('caption').first().text());
    // Now call the existing logic with our filtered data
    return tableToRatesBlocksFromData(headers, rows, caption, sourceUrl, legendMap);
}
function tableToRatesBlocksFromData(headers, rows, caption, sourceUrl, legendMap) {
    var _a, _b;
    if (legendMap === void 0) { legendMap = {}; }
    var stepCols = [];
    headers.forEach(function (h, i) {
        var t = (h || '').toLowerCase();
        // skip explicit effective date columns
        if (/effective/.test(t) || /effective date/.test(t) || /date/.test(t))
            return;
        // mark columns that explicitly mention range
        var isRangeHeader = /range/.test(t);
        if (/^(step(\s*\d+)?|\d+|rate\s*\d+|salary|pay|range)$/i.test(t) || isRangeHeader) {
            stepCols.push({ idx: i, isRange: isRangeHeader });
        }
    });
    if (!stepCols.length) {
        // fallback: use all columns except the first (commonly effective date)
        for (var i = 1; i < headers.length; i++)
            stepCols.push({ idx: i, isRange: /range/.test(headers[i]) });
    }
    var out = [];
    // NEW APPROACH: If we have legend mappings and headers that look like symbols,
    // create one entry per effective date with all salary steps
    if (Object.keys(legendMap).length > 0) {
        // Check if headers contain legend symbols
        var symbolHeaders = headers.filter(function (h, i) { return i > 0 && legendMap[clean(h)]; });
        if (symbolHeaders.length > 0) {
            // Process each symbol/effective date
            symbolHeaders.forEach(function (header, headerIdx) {
                var symbol = clean(header);
                var effectiveDate = legendMap[symbol];
                if (!effectiveDate)
                    return;
                var entry = { 'effective-date': effectiveDate };
                if (sourceUrl)
                    entry['_source'] = sourceUrl;
                // For each row, get the salary value from this column
                var stepNum = 1;
                rows.forEach(function (row, rowIdx) {
                    var _a;
                    var columnIdx = headerIdx + 1; // +1 because we filtered out first column
                    var cellValue = clean((_a = row[columnIdx]) !== null && _a !== void 0 ? _a : '');
                    if (cellValue) {
                        // Check if it's a range
                        var range = parseRange(cellValue);
                        if (range && range.length === 2) {
                            entry["step-".concat(stepNum)] = range[0];
                            entry["_raw-step-".concat(stepNum)] = cellValue;
                            entry["step-".concat(stepNum + 1)] = range[1];
                            entry["_raw-step-".concat(stepNum + 1)] = cellValue;
                            stepNum += 2;
                        }
                        else {
                            var v = parseMoney(cellValue);
                            if (!Number.isNaN(v)) {
                                entry["step-".concat(stepNum)] = v;
                                stepNum++;
                            }
                        }
                    }
                });
                if (Object.keys(entry).some(function (k) { return /^step-\d+$/.test(k); })) {
                    out.push(entry);
                }
            });
            return out;
        }
    }
    // FALLBACK: Original logic for non-legend tables
    // For each data row, try to extract an effective date from the first cell
    for (var _c = 0, rows_2 = rows; _c < rows_2.length; _c++) {
        var row = rows_2[_c];
        var rowFirst = clean((_a = row[0]) !== null && _a !== void 0 ? _a : '');
        // prefer the full text (including label like "$)" or "A)" and any trailing notes)
        var dateRe = /[A-Z]?[)\w\s\-,:]*?\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/;
        var eff = null;
        if (dateRe.test(rowFirst)) {
            eff = rowFirst;
        }
        else if (caption && dateRe.test(caption)) {
            eff = caption;
        }
        else {
            eff = null;
        }
        var entry = { 'effective-date': eff };
        // record the source page for this block so consumers can trace origin
        if (sourceUrl)
            entry['_source'] = sourceUrl;
        var n = 1;
        for (var _d = 0, stepCols_2 = stepCols; _d < stepCols_2.length; _d++) {
            var sc = stepCols_2[_d];
            var i = sc.idx;
            var cell = clean((_b = row[i]) !== null && _b !== void 0 ? _b : '');
            if (!cell)
                continue;
            if (sc.isRange) {
                var range = parseRange(cell);
                if (range && range.length === 2) {
                    entry["step-".concat(n)] = range[0];
                    entry["_raw-step-".concat(n)] = cell;
                    entry["step-".concat(n + 1)] = range[1];
                    entry["_raw-step-".concat(n + 1)] = cell;
                    n += 2;
                    continue;
                }
            }
            var v = parseMoney(cell);
            if (!Number.isNaN(v)) {
                entry["step-".concat(n)] = v;
                n++;
            }
        }
        if (Object.keys(entry).some(function (k) { return /^step-\d+$/.test(k); }))
            out.push(entry);
    }
    return out;
}
var headingLevel = function ($el) {
    var tag = ($el.prop('tagName') || '').toString().toLowerCase();
    var m = tag.match(/^h([1-6])$/);
    return m ? Number(m[1]) : null;
};
function collectUntilNextHeading($, $start) {
    var _a;
    var out = [];
    if (!$start.length)
        return out;
    var startLevel = (_a = headingLevel($start)) !== null && _a !== void 0 ? _a : 6;
    var $cur = $start.next();
    while ($cur && $cur.length) {
        var lvl = headingLevel($cur);
        if (lvl && lvl <= startLevel)
            break;
        out.push($cur.get(0));
        $cur = $cur.next();
    }
    return out;
}
function findAppendixOrRatesStarts($) {
    // Return possible starting headings for Appendix A or Rates of pay
    var all = $('h1,h2,h3,h4,h5,h6')
        .toArray()
        .map(function (e) { return $(e); });
    return all.filter(function ($h) {
        var t = clean($h.text()).toLowerCase();
        return (/appendix\s*a\b/.test(t) ||
            /\b(annual\s+)?rates\s+of\s+pay\b/.test(t) ||
            /\brates\b/.test(t) ||
            /\bsalary\s+rates\b/.test(t));
    });
}
function parseAppendixInNodes($, nodes, sourceUrl) {
    var _a, _b, _c;
    var out = {};
    var currentClass = null;
    for (var _d = 0, nodes_1 = nodes; _d < nodes_1.length; _d++) {
        var node = nodes_1[_d];
        var $el = $(node);
        var tag = ($el.prop('tagName') || '').toString().toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
            var maybe = firstClassificationIn(clean($el.text()));
            if (maybe) {
                currentClass = maybe;
                if (!out[currentClass])
                    out[currentClass] = { 'annual-rates-of-pay': [] };
            }
            continue;
        }
        // Try to find tables in this node. If a table caption contains a
        // classification (e.g. "AI-01: annual rates of pay"), prefer that.
        var tables = $el.is('table')
            ? [$el]
            : $el
                .find('table')
                .toArray()
                .map(function (e) { return $(e); });
        for (var _e = 0, tables_1 = tables; _e < tables_1.length; _e++) {
            var $t = tables_1[_e];
            // Attempt to extract classification from the table caption first.
            var captionText = clean($t.find('caption').first().text());
            var fromCaption = (_a = firstClassificationIn(captionText !== null && captionText !== void 0 ? captionText : '')) !== null && _a !== void 0 ? _a : null;
            var useClass = fromCaption !== null && fromCaption !== void 0 ? fromCaption : currentClass;
            if (!useClass)
                continue;
            if (!out[useClass])
                out[useClass] = { 'annual-rates-of-pay': [] };
            var blocks = tableToRatesBlocks($, $t, sourceUrl);
            if (!blocks.length)
                continue;
            for (var _f = 0, blocks_1 = blocks; _f < blocks_1.length; _f++) {
                var block = blocks_1[_f];
                // Attach group/level when possible: AI-01 -> group: AI, level: 01
                var m = (fromCaption !== null && fromCaption !== void 0 ? fromCaption : useClass).match(/^([A-Z]{1,4})(?:-(\d{1,3}))?$/);
                if (m) {
                    block.group = m[1];
                    block.level = (_b = m[2]) !== null && _b !== void 0 ? _b : null;
                }
                else {
                    // fallback: try to capture leading alpha sequence
                    var mm = (fromCaption !== null && fromCaption !== void 0 ? fromCaption : useClass).match(/^([A-Z]{2,4})/);
                    if (mm)
                        block.group = mm[1];
                }
                out[useClass]['annual-rates-of-pay'].push(block);
            }
        }
    }
    // de-duplicate entries
    for (var _g = 0, _h = Object.keys(out); _g < _h.length; _g++) {
        var k = _h[_g];
        var seen = new Set();
        var arr = out[k]['annual-rates-of-pay'];
        // Keep the last entry for duplicate effective-date. We'll iterate from
        // the end, record seen dates, and then reverse to preserve original order
        var rev = [];
        var seenDates = new Set();
        for (var i = arr.length - 1; i >= 0; i--) {
            var d = String((_c = arr[i]['effective-date']) !== null && _c !== void 0 ? _c : '').trim();
            if (d && !seenDates.has(d)) {
                seenDates.add(d);
                rev.push(arr[i]);
            }
        }
        out[k]['annual-rates-of-pay'] = rev.reverse();
    }
    return out;
}
function mergeData(a, b, sourceUrl) {
    var _a;
    var isUnrepresented = sourceUrl === null || sourceUrl === void 0 ? void 0 : sourceUrl.includes('rates-pay-unrepresented');
    for (var _b = 0, _c = Object.keys(b); _b < _c.length; _b++) {
        var k = _c[_b];
        var finalKey = k;
        // If this is from the unrepresented page AND the code already exists,
        // add "-EXCLUDED" suffix to distinguish it from collective agreement rates
        if (isUnrepresented && a[k]) {
            finalKey = "".concat(k, "-EXCLUDED");
        }
        if (!a[finalKey])
            a[finalKey] = { 'annual-rates-of-pay': [] };
        (_a = a[finalKey]['annual-rates-of-pay']).push.apply(_a, b[k]['annual-rates-of-pay']);
    }
}
function sortSteps(entry) {
    var eff = entry["effective-date"], rest = __rest(entry, ['effective-date']);
    // Collect numeric/string steps and any _raw-step metadata
    var stepEntries = [];
    var rawMap = new Map();
    for (var _a = 0, _b = Object.entries(rest); _a < _b.length; _a++) {
        var _c = _b[_a], k = _c[0], v = _c[1];
        var stepMatch = k.match(/^step-(\d+)$/);
        if (stepMatch) {
            var idx = Number(stepMatch[1]);
            // preserve original string values (ranges) and numeric values as numbers
            stepEntries.push([idx, typeof v === 'string' ? v : Number(v)]);
            continue;
        }
        var rawMatch = k.match(/^_raw-step-(\d+)$/);
        if (rawMatch) {
            var idx = Number(rawMatch[1]);
            if (typeof v === 'string')
                rawMap.set(idx, v);
        }
    }
    stepEntries.sort(function (a, b) { return a[0] - b[0]; });
    // Renumber steps sequentially to step-1 ... step-N and carry raw metadata.
    var out = { 'effective-date': eff !== null && eff !== void 0 ? eff : null };
    var cur = 1;
    for (var _d = 0, stepEntries_1 = stepEntries; _d < stepEntries_1.length; _d++) {
        var _e = stepEntries_1[_d], _ = _e[0], val = _e[1];
        out["step-".concat(cur)] = val;
        var raw = rawMap.get(_);
        if (raw)
            out["_raw-step-".concat(cur)] = raw;
        cur++;
    }
    // Preserve other underscore-prefixed metadata (e.g. _source)
    for (var _f = 0, _g = Object.entries(rest); _f < _g.length; _f++) {
        var _h = _g[_f], k = _h[0], v = _h[1];
        if (k.startsWith('_') && !/^_raw-step-\d+$/.test(k)) {
            out[k] = v;
        }
    }
    return out;
}
/* ---------------- core scrape ---------------- */
function fetchPage(url) {
    return __awaiter(this, void 0, void 0, function () {
        var r, errorText, html, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log("Fetching: ".concat(url));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                'User-Agent': 'VAC scraper (respectful fetch)',
                                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                                'Accept-Encoding': 'gzip, deflate',
                                Connection: 'keep-alive',
                                'Upgrade-Insecure-Requests': '1'
                            }
                        })];
                case 2:
                    r = _a.sent();
                    if (!!r.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, r.text()];
                case 3:
                    errorText = _a.sent();
                    log("HTTP ".concat(r.status, " for ").concat(url, ". Response: ").concat(errorText.substring(0, 200), "..."));
                    throw new Error("HTTP ".concat(r.status, " for ").concat(url));
                case 4: return [4 /*yield*/, r.text()];
                case 5:
                    html = _a.sent();
                    // Check if we got an error page instead of content
                    if (html.includes('An error occurred') ||
                        html.includes('Page not found') ||
                        html.includes('404') ||
                        html.length < 1000) {
                        log("Warning: ".concat(url, " returned suspicious content (length: ").concat(html.length, ")"));
                        log("Content preview: ".concat(html.substring(0, 500), "..."));
                    }
                    return [4 /*yield*/, sleep(POLITE_DELAY_MS)];
                case 6:
                    _a.sent();
                    return [2 /*return*/, html];
                case 7:
                    error_1 = _a.sent();
                    log("Failed to fetch ".concat(url, ": ").concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                    throw error_1;
                case 8: return [2 /*return*/];
            }
        });
    });
}
function scrapeAppendixAFromPage(url) {
    return __awaiter(this, void 0, void 0, function () {
        var html, $, shouldUseAI, result, converted_1, aiError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchPage(url)];
                case 1:
                    html = _a.sent();
                    $ = (0, cheerio_1.load)(html);
                    shouldUseAI = FORCE_AI || (USE_AI_PARSING && PROBLEMATIC_URLS.some(function (pattern) { return url.includes(pattern); }));
                    if (!shouldUseAI) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    log("\uD83E\uDD16 Using AI parsing for ".concat(url));
                    return [4 /*yield*/, (0, ai_parser_1.hybridParse)(html, url, function ($) { return parseAppendixFromDocument($, url); })];
                case 3:
                    result = _a.sent();
                    if (result.success) {
                        log("\u2705 AI parsing successful (method: ".concat(result.method, ", cost: $").concat(result.cost.toFixed(3), ")"));
                        ai_parser_1.usageTracker.trackCall(result);
                        // Convert AI format to internal format
                        if (result.method === 'ai-text' && result.data.length > 0) {
                            converted_1 = {};
                            result.data.forEach(function (entry) {
                                var rates = {
                                    'effective-date': entry.effectiveDate,
                                    _source: entry.source
                                };
                                entry.steps.forEach(function (step) {
                                    rates["step-".concat(step.step)] = step.amount;
                                });
                                if (!converted_1[entry.classification]) {
                                    converted_1[entry.classification] = { 'annual-rates-of-pay': [] };
                                }
                                converted_1[entry.classification]['annual-rates-of-pay'].push(rates);
                            });
                            return [2 /*return*/, converted_1];
                        }
                    }
                    else {
                        log("\u26A0\uFE0F AI parsing failed, falling back to DOM parser");
                    }
                    return [3 /*break*/, 5];
                case 4:
                    aiError_1 = _a.sent();
                    log("\u26A0\uFE0F AI parsing error: ".concat(aiError_1 instanceof Error ? aiError_1.message : String(aiError_1)));
                    log("   Falling back to DOM parser");
                    return [3 /*break*/, 5];
                case 5:
                    // Use simplified parser for unrepresented pages
                    if (url === null || url === void 0 ? void 0 : url.includes('rates-pay-unrepresented')) {
                        return [2 /*return*/, parseUnrepresentedPage($, url)];
                    }
                    return [2 /*return*/, parseAppendixFromDocument($, url)];
            }
        });
    });
}
exports.scrapeAppendixAFromPage = scrapeAppendixAFromPage;
/**
 * Simplified parser for unrepresented senior excluded employee pages.
 * These pages have a simpler structure with tables containing captions like:
 * "Code: 30100<br>AS-07 – Annual rates of pay (in dollars)"
 */
function parseUnrepresentedPage($, sourceUrl) {
    var _a, _b;
    var result = {};
    // Map RCMP rank names to classification codes
    var rcmpRankMap = {
        inspector: 'CO-RCMP-01',
        superintendent: 'CO-RCMP-02',
        'chief superintendent': 'CO-RCMP-03',
        'assistant commissioner (1)': 'CO-RCMP-04',
        'assistant commissioner (2)': 'CO-RCMP-05',
        'deputy commissioner': 'CO-RCMP-06'
    };
    // Find all tables on the page
    var tables = $('table').toArray();
    for (var _c = 0, tables_2 = tables; _c < tables_2.length; _c++) {
        var tableElem = tables_2[_c];
        var $table = $(tableElem);
        // Get the caption text which contains the classification code
        var captionText = clean($table.find('caption').first().text());
        // Extract classification from caption (e.g., "AS-07", "EX-01")
        var classification = firstClassificationIn(captionText);
        // Check for RCMP rank-based classifications
        if (!classification) {
            var captionLower = captionText.toLowerCase();
            for (var _d = 0, _e = Object.entries(rcmpRankMap); _d < _e.length; _d++) {
                var _f = _e[_d], rank = _f[0], code = _f[1];
                if (captionLower.includes(rank)) {
                    classification = code;
                    break;
                }
            }
        }
        if (!classification) {
            // Try looking for classification in heading before table
            var $prevHeading = $table.prevAll('h1,h2,h3,h4,h5,h6').first();
            if ($prevHeading && $prevHeading.length) {
                classification = firstClassificationIn(clean($prevHeading.text()));
            }
            if (!classification)
                continue;
        } // Parse the table structure
        var _g = simpleTable($, $table), headers = _g.headers, rows = _g.rows;
        if (!headers.length || !rows.length)
            continue;
        // Find the "Effective Date" column and salary step columns
        var dateColIndex = headers.findIndex(function (h) { return /effective\s*date/i.test(clean(h)); });
        if (dateColIndex === -1)
            continue;
        // Find all step columns (step-1, step-2, etc. or just numeric columns)
        var stepColumns = [];
        for (var i = 0; i < headers.length; i++) {
            if (i === dateColIndex)
                continue;
            var headerText = clean(headers[i]);
            // Match "Step 1", "Step-1", or just "1", "2", "3"
            var stepMatch = headerText.match(/step[-\s]*(\d+)/i) || headerText.match(/^(\d+)$/);
            if (stepMatch) {
                stepColumns.push({ index: i, stepNum: parseInt(stepMatch[1], 10) });
            }
            // Check for Minimum/Maximum columns (RCMP ranks)
            else if (/minimum/i.test(headerText)) {
                stepColumns.push({ index: i, stepNum: 1, isMinMax: true });
            }
            else if (/maximum/i.test(headerText)) {
                stepColumns.push({ index: i, stepNum: 2, isMinMax: true });
            }
        }
        // If no step columns found, look for any numeric columns after date
        if (stepColumns.length === 0) {
            for (var i = dateColIndex + 1; i < headers.length; i++) {
                // Assume columns after date are steps in order
                stepColumns.push({ index: i, stepNum: i - dateColIndex });
            }
        }
        if (stepColumns.length === 0)
            continue;
        // Initialize classification entry
        if (!result[classification]) {
            result[classification] = { 'annual-rates-of-pay': [] };
        }
        // Process each row
        for (var _h = 0, rows_3 = rows; _h < rows_3.length; _h++) {
            var row = rows_3[_h];
            var dateText = clean((_a = row[dateColIndex]) !== null && _a !== void 0 ? _a : '');
            if (!dateText)
                continue;
            var entry = {
                'effective-date': dateText
            };
            // Add source URL for tracking
            if (sourceUrl) {
                entry._source = sourceUrl;
            }
            // Extract salary values for each step
            for (var _j = 0, stepColumns_1 = stepColumns; _j < stepColumns_1.length; _j++) {
                var _k = stepColumns_1[_j], index = _k.index, stepNum = _k.stepNum;
                var cellText = clean((_b = row[index]) !== null && _b !== void 0 ? _b : '');
                if (!cellText)
                    continue;
                // Check if cell contains a range (e.g., "100,220 to 114,592")
                var rangeMatch = cellText.match(/(\d[\d,]+)\s+to\s+(\d[\d,]+)/i);
                if (rangeMatch) {
                    // Split range into step-1 (minimum) and step-2 (maximum)
                    var minAmount = parseMoney(rangeMatch[1]);
                    var maxAmount = parseMoney(rangeMatch[2]);
                    if (minAmount !== null && minAmount > 0) {
                        entry['step-1'] = minAmount;
                    }
                    if (maxAmount !== null && maxAmount > 0) {
                        entry['step-2'] = maxAmount;
                    }
                }
                else {
                    // Single value - treat as normal step
                    var amount = parseMoney(cellText);
                    if (amount !== null && amount > 0) {
                        entry["step-".concat(stepNum)] = amount;
                    }
                }
            }
            // Only add entry if it has at least one salary step
            var hasSteps = Object.keys(entry).some(function (k) { return k.startsWith('step-'); });
            if (hasSteps) {
                result[classification]['annual-rates-of-pay'].push(entry);
            }
        }
    }
    return result;
}
function parseAppendixFromDocument($, sourceUrl) {
    var _a, _b, _c, _d, _e, _f;
    var starts = findAppendixOrRatesStarts($);
    if (!starts.length)
        return {};
    var result = {};
    var _loop_1 = function ($start) {
        var $section = $start.closest('section.pdf-section');
        // Collect tables from the section and from the sibling traversal
        var tables = [];
        var seenTables = new Set();
        if ($section && $section.length) {
            $section
                .find('table')
                .toArray()
                .forEach(function (t) {
                if (!seenTables.has(t)) {
                    seenTables.add(t);
                    tables.push($(t));
                }
            });
        }
        var nodes = collectUntilNextHeading($, $start);
        // Parse legend mappings from all collected nodes
        var legendMap = parseClassificationLegend($, nodes);
        for (var _m = 0, nodes_2 = nodes; _m < nodes_2.length; _m++) {
            var n = nodes_2[_m];
            var $n = $(n);
            $n.find('table')
                .toArray()
                .forEach(function (t) {
                if (!seenTables.has(t)) {
                    seenTables.add(t);
                    tables.push($(t));
                }
            });
            // also if the node itself is a table
            if ($n.is('table') && !seenTables.has($n.get(0))) {
                seenTables.add($n.get(0));
                tables.push($n);
            }
        }
        var _loop_2 = function ($t) {
            var captionText = clean($t.find('caption').first().text());
            var fromCaption = (_a = firstClassificationIn(captionText !== null && captionText !== void 0 ? captionText : '')) !== null && _a !== void 0 ? _a : null;
            // Try to find nearest previous heading to this table for classification
            var useClass = fromCaption;
            if (!useClass) {
                var $prevHeading = $t.prevAll('h1,h2,h3,h4,h5,h6').first();
                if ($prevHeading && $prevHeading.length) {
                    useClass = (_b = firstClassificationIn(clean($prevHeading.text()))) !== null && _b !== void 0 ? _b : null;
                }
            }
            // Fallback to the start heading classification
            if (!useClass)
                useClass = (_c = firstClassificationIn(clean($start.text()))) !== null && _c !== void 0 ? _c : null;
            // NEW: Check if this table contains multiple classifications in its rows
            var rowClassifications = new Map();
            var _p = simpleTable($, $t), headers = _p.headers, rows = _p.rows;
            // Enhanced classification detection for complex tables
            var allRowClassifications = [];
            var rowClassificationMapping = {};
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var rowClass = null;
                // Try multiple approaches to find classification in this row
                // Look in first 3 columns for classification codes
                for (var cellIndex = 0; cellIndex < Math.min(3, row.length); cellIndex++) {
                    var cellText = clean((_d = row[cellIndex]) !== null && _d !== void 0 ? _d : '');
                    var foundClass = firstClassificationIn(cellText);
                    if (foundClass) {
                        rowClass = foundClass;
                        break;
                    }
                    // Additional aggressive pattern matching for variations like "AS 1" or just "1" in AS tables
                    if (!foundClass && useClass && useClass.startsWith('AS')) {
                        // Look for standalone digits 1-8 that might be AS levels
                        var digitMatch = cellText.match(/^\s*(\d)\s*$/);
                        if (digitMatch && digitMatch[1]) {
                            var level = digitMatch[1];
                            if (parseInt(level) >= 1 && parseInt(level) <= 8) {
                                rowClass = "AS-0".concat(level);
                                break;
                            }
                        }
                    }
                }
                if (rowClass) {
                    allRowClassifications.push(rowClass);
                    rowClassificationMapping[i] = rowClass;
                }
            }
            // Group rows by classification
            for (var i = 0; i < rows.length; i++) {
                var rowClass = rowClassificationMapping[i];
                if (rowClass) {
                    if (!rowClassifications.has(rowClass)) {
                        rowClassifications.set(rowClass, []);
                    }
                    rowClassifications.get(rowClass).push(rows[i]);
                }
            }
            // If we found multiple classifications in rows, process each separately
            if (rowClassifications.size > 0) {
                rowClassifications.forEach(function (classRows, classification) {
                    var _a;
                    if (!result[classification])
                        result[classification] = { 'annual-rates-of-pay': [] };
                    // Create blocks using the existing tableToRatesBlocks logic but with filtered rows
                    var blocks = tableToRatesBlocksWithRows($, $t, classRows, sourceUrl, legendMap);
                    for (var _b = 0, blocks_3 = blocks; _b < blocks_3.length; _b++) {
                        var block = blocks_3[_b];
                        var m = classification.match(/^([A-Z]{1,4})(?:-(\d{1,3}))?$/);
                        if (m) {
                            block.group = m[1];
                            block.level = (_a = m[2]) !== null && _a !== void 0 ? _a : null;
                        }
                        else {
                            var mm = classification.match(/^([A-Z]{2,4})/);
                            if (mm)
                                block.group = mm[1];
                        }
                        result[classification]['annual-rates-of-pay'].push(block);
                    }
                });
            }
            else {
                // Fallback to original single-classification logic
                if (!useClass)
                    return "continue";
                if (!result[useClass])
                    result[useClass] = { 'annual-rates-of-pay': [] };
                var blocks = tableToRatesBlocks($, $t, sourceUrl, legendMap);
                for (var _q = 0, blocks_2 = blocks; _q < blocks_2.length; _q++) {
                    var block = blocks_2[_q];
                    var m = (fromCaption !== null && fromCaption !== void 0 ? fromCaption : useClass).match(/^([A-Z]{1,4})(?:-(\d{1,3}))?$/);
                    if (m) {
                        block.group = m[1];
                        block.level = (_e = m[2]) !== null && _e !== void 0 ? _e : null;
                    }
                    else {
                        var mm = (fromCaption !== null && fromCaption !== void 0 ? fromCaption : useClass).match(/^([A-Z]{2,4})/);
                        if (mm)
                            block.group = mm[1];
                    }
                    result[useClass]['annual-rates-of-pay'].push(block);
                }
            }
        };
        // Process each table explicitly
        for (var _o = 0, tables_3 = tables; _o < tables_3.length; _o++) {
            var $t = tables_3[_o];
            _loop_2($t);
        }
    };
    for (var _g = 0, starts_1 = starts; _g < starts_1.length; _g++) {
        var $start = starts_1[_g];
        _loop_1($start);
    }
    // Merge/sort/dedupe similar to previous behavior
    for (var _h = 0, _j = Object.keys(result); _h < _j.length; _h++) {
        var k = _j[_h];
        result[k]['annual-rates-of-pay'] = dedupe(result[k]['annual-rates-of-pay'].map(sortSteps), function (x) {
            return JSON.stringify(x);
        });
    }
    // Keep last occurrence per effective-date
    for (var _k = 0, _l = Object.keys(result); _k < _l.length; _k++) {
        var k = _l[_k];
        var arr = result[k]['annual-rates-of-pay'];
        var rev = [];
        var seenDates = new Set();
        for (var i = arr.length - 1; i >= 0; i--) {
            var d = String((_f = arr[i]['effective-date']) !== null && _f !== void 0 ? _f : '').trim();
            if (d && !seenDates.has(d)) {
                seenDates.add(d);
                rev.push(arr[i]);
            }
        }
        result[k]['annual-rates-of-pay'] = rev.reverse();
    }
    return result;
}
exports.parseAppendixFromDocument = parseAppendixFromDocument;
function scrapeAll(urls) {
    return __awaiter(this, void 0, void 0, function () {
        var result, ok, failed, _a, urls_1, url, pageData, classificationCount, e_1, errorMsg, stats;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    result = {};
                    ok = 0;
                    failed = [];
                    _a = 0, urls_1 = urls;
                    _b.label = 1;
                case 1:
                    if (!(_a < urls_1.length)) return [3 /*break*/, 6];
                    url = urls_1[_a];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    log("Processing ".concat(urls.indexOf(url) + 1, "/").concat(urls.length, ": ").concat(url));
                    return [4 /*yield*/, scrapeAppendixAFromPage(url)];
                case 3:
                    pageData = _b.sent();
                    classificationCount = Object.keys(pageData).length;
                    if (classificationCount > 0) {
                        mergeData(result, pageData, url); // Pass URL to track source
                        log("\u2713 Success: ".concat(url, " -> ").concat(classificationCount, " classifications"));
                        ok++;
                    }
                    else {
                        log("\u26A0 Warning: ".concat(url, " -> No classifications found"));
                        failed.push(url);
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _b.sent();
                    errorMsg = e_1 instanceof Error ? e_1.message : String(e_1);
                    log("\u2717 FAIL: ".concat(url, " -> ").concat(errorMsg));
                    failed.push(url);
                    return [3 /*break*/, 5];
                case 5:
                    _a++;
                    return [3 /*break*/, 1];
                case 6:
                    log("\n=== SCRAPING SUMMARY ===");
                    log("Successful: ".concat(ok, "/").concat(urls.length, " pages"));
                    log("Total classifications found: ".concat(Object.keys(result).length));
                    if (failed.length > 0) {
                        log("\nFailed URLs (".concat(failed.length, "):"));
                        failed.forEach(function (url) { return log("  - ".concat(url)); });
                    }
                    // Display AI usage statistics if AI was used
                    if (USE_AI_PARSING || FORCE_AI) {
                        stats = ai_parser_1.usageTracker.getStats();
                        if (stats.totalCalls > 0) {
                            log("\n\uD83D\uDCCA AI Usage Statistics:");
                            log("   Total AI calls: ".concat(stats.totalCalls));
                            log("   Successful: ".concat(stats.successfulCalls, " (").concat((stats.successRate * 100).toFixed(1), "%)"));
                            log("   Total cost: $".concat(stats.totalCost.toFixed(3)));
                            log("   Average cost per call: $".concat(stats.averageCost.toFixed(4)));
                        }
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
exports.scrapeAll = scrapeAll;
/* ---------------- entry point ---------------- */
// Helper to detect if we're running in a serverless environment
function isServerless() {
    return !!(process.env.LAMBDA_TASK_ROOT ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.VERCEL ||
        process.env.NETLIFY);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var data, sortedData, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    log('Starting scraper');
                    return [4 /*yield*/, scrapeAll(URLS)];
                case 1:
                    data = _a.sent();
                    sortedData = sortSalaryData(data);
                    // In serverless environments, return the data instead of writing to file
                    // (serverless file systems are read-only except /tmp)
                    if (isServerless()) {
                        log('Serverless environment detected - returning data');
                        return [2 /*return*/, sortedData];
                    }
                    // In local/non-serverless environments, write to file as before
                    return [4 /*yield*/, fs.writeFile(OUTPUT_JSON, JSON.stringify(sortedData, null, 2), 'utf-8')];
                case 2:
                    // In local/non-serverless environments, write to file as before
                    _a.sent();
                    log("Saved ".concat(OUTPUT_JSON));
                    return [2 /*return*/, sortedData];
                case 3:
                    e_2 = _a.sent();
                    log("Fatal error: ".concat(e_2.message));
                    process.exitCode = 1;
                    throw e_2; // Re-throw so API can handle the error
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.main = main;
// If NODE_LOCAL_TEST is set, allow parsing a local HTML file instead of fetching
// remote URLs. This is useful for quickly validating parsing against
// `sample.html` in the repo.
function runLocalTestIfRequested() {
    return __awaiter(this, void 0, void 0, function () {
        var localPath, html, $, starts, parsedPerStart, _a, starts_2, $start, nodes, merged, _b, parsedPerStart_1, chunk, _c, _d, k, e_3;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (process.env.NODE_LOCAL_TEST !== '1')
                        return [2 /*return*/, false];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    localPath = process.env.NODE_LOCAL_FILE || 'sample.html';
                    log("Local test: reading ".concat(localPath));
                    return [4 /*yield*/, fs.readFile(localPath, 'utf-8')];
                case 2:
                    html = _e.sent();
                    $ = (0, cheerio_1.load)(html);
                    starts = findAppendixOrRatesStarts($);
                    if (!starts.length) {
                        log('WARN no Appendix A or Rates of pay headings found in local file');
                        return [2 /*return*/, true];
                    }
                    parsedPerStart = [];
                    for (_a = 0, starts_2 = starts; _a < starts_2.length; _a++) {
                        $start = starts_2[_a];
                        nodes = collectUntilNextHeading($, $start);
                        parsedPerStart.push(parseAppendixInNodes($, nodes, "local:".concat(localPath)));
                    }
                    merged = {};
                    for (_b = 0, parsedPerStart_1 = parsedPerStart; _b < parsedPerStart_1.length; _b++) {
                        chunk = parsedPerStart_1[_b];
                        mergeData(merged, chunk);
                    }
                    for (_c = 0, _d = Object.keys(merged); _c < _d.length; _c++) {
                        k = _d[_c];
                        merged[k]['annual-rates-of-pay'] = dedupe(merged[k]['annual-rates-of-pay'].map(sortSteps), function (x) {
                            return JSON.stringify(x);
                        });
                    }
                    console.log(JSON.stringify(merged, null, 2));
                    return [2 /*return*/, true];
                case 3:
                    e_3 = _e.sent();
                    log("Local test failed: ".concat(e_3.message));
                    return [2 /*return*/, true];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Run local test when requested, otherwise run normal main
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var didLocal;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, runLocalTestIfRequested()];
            case 1:
                didLocal = _a.sent();
                if (!!didLocal) return [3 /*break*/, 3];
                return [4 /*yield*/, main()];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); })();
