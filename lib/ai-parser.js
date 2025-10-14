"use strict";
// AI-Assisted Table Parser Module
// Drop-in replacement for complex table parsing in scrape.ts
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageTracker = exports.AIUsageTracker = exports.hybridParse = exports.convertToInternalFormat = exports.validateSalaryData = exports.parseTableWithAI = void 0;
var openai_1 = __importDefault(require("openai"));
/**
 * Parse salary table using GPT-4
 * Cost: ~$0.01-0.03 per call
 */
function parseTableWithAI(html, sourceUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var openai, prompt, response, content, jsonContent, parsed, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    openai = new openai_1.default({
                        apiKey: process.env.OPENAI_API_KEY
                    });
                    prompt = "\nExtract salary data from this HTML table. Return a JSON object with a \"classifications\" array.\n\nFormat:\n{\n  \"classifications\": [\n    {\n      \"classification\": \"AS-01\",\n      \"steps\": [\n        {\"step\": 1, \"amount\": 50000},\n        {\"step\": 2, \"amount\": 52000}\n      ],\n      \"effectiveDate\": \"2024-01-01\",\n      \"source\": \"".concat(sourceUrl, "\"\n    }\n  ]\n}\n\nRules:\n1. Extract ALL classification codes from the table caption or headers\n2. Convert salaries to numbers (remove $, commas, spaces)\n3. Parse dates to YYYY-MM-DD format\n4. If table shows \"X to Y\" range, create step-1 (X) and step-2 (Y)\n5. Skip header rows, footnotes, and non-salary data\n6. Preserve step numbers as shown in table\n7. Each classification gets its own entry in the classifications array\n\nHTML Table:\n").concat(html.substring(0, 8000), "\n");
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: 'gpt-4-turbo-preview',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'You are a data extraction expert. Return only valid JSON arrays with no additional text or markdown.'
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            temperature: 0,
                            max_tokens: 4000,
                            response_format: { type: 'json_object' }
                        })];
                case 1:
                    response = _a.sent();
                    content = response.choices[0].message.content || '{"classifications": []}';
                    jsonContent = content
                        .replace(/```json\n?/g, '')
                        .replace(/```\n?/g, '')
                        .trim();
                    parsed = void 0;
                    try {
                        parsed = JSON.parse(jsonContent);
                        data = Array.isArray(parsed) ? parsed : parsed.classifications || parsed.data || [];
                        // Debug output
                        if (process.env.DEBUG_AI) {
                            console.log('AI Response:', JSON.stringify(parsed, null, 2));
                        }
                        return [2 /*return*/, {
                                success: true,
                                data: data,
                                confidence: 0.95,
                                method: 'ai-text',
                                cost: 0.02
                            }];
                    }
                    catch (parseError) {
                        console.error('Failed to parse AI response:', jsonContent);
                        return [2 /*return*/, {
                                success: false,
                                data: [],
                                confidence: 0,
                                method: 'ai-text',
                                cost: 0.02
                            }];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('AI parsing error:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            data: [],
                            confidence: 0,
                            method: 'ai-text',
                            cost: 0
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.parseTableWithAI = parseTableWithAI;
/**
 * Validate parsed salary data
 */
function validateSalaryData(data) {
    var errors = [];
    if (!Array.isArray(data) || data.length === 0) {
        errors.push('No data extracted');
        return { isValid: false, errors: errors };
    }
    data.forEach(function (entry, index) {
        var _a;
        // Check required fields
        if (!entry.classification) {
            errors.push("Entry ".concat(index, ": Missing classification"));
        }
        if (!entry.steps || entry.steps.length === 0) {
            errors.push("Entry ".concat(index, " (").concat(entry.classification, "): No salary steps"));
        }
        // Validate salary amounts
        (_a = entry.steps) === null || _a === void 0 ? void 0 : _a.forEach(function (step, stepIndex) {
            if (typeof step.amount !== 'number') {
                errors.push("".concat(entry.classification, " step ").concat(stepIndex, ": Invalid amount type"));
            }
            // Reasonable salary range: $1 to $500,000
            if (step.amount < 1 || step.amount > 500000) {
                errors.push("".concat(entry.classification, " step ").concat(stepIndex, ": Suspicious amount $").concat(step.amount));
            }
        });
        // Validate step progression (should be increasing)
        if (entry.steps && entry.steps.length > 1) {
            for (var i = 1; i < entry.steps.length; i++) {
                if (entry.steps[i].amount < entry.steps[i - 1].amount) {
                    errors.push("".concat(entry.classification, ": Step ").concat(i + 1, " is lower than step ").concat(i));
                }
            }
        }
    });
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
exports.validateSalaryData = validateSalaryData;
/**
 * Convert AI format to internal scraper format
 */
function convertToInternalFormat(aiData) {
    var result = {};
    aiData.forEach(function (entry) {
        var rates = {
            'effective-date': entry.effectiveDate,
            _source: entry.source
        };
        // Add steps
        entry.steps.forEach(function (step) {
            rates["step-".concat(step.step)] = step.amount;
        });
        // Create or append to classification
        if (!result[entry.classification]) {
            result[entry.classification] = {
                'annual-rates-of-pay': []
            };
        }
        result[entry.classification]['annual-rates-of-pay'].push(rates);
    });
    return result;
}
exports.convertToInternalFormat = convertToInternalFormat;
/**
 * Hybrid parser: Try DOM first, fallback to AI
 */
function hybridParse(html, sourceUrl, domParser) {
    return __awaiter(this, void 0, void 0, function () {
        var domResult, domConfidence, tableHTML, aiResult, validation;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Step 1: Try DOM parsing
                    console.log("\uD83D\uDCC4 Trying DOM parser for ".concat(sourceUrl));
                    domResult = domParser(html);
                    domConfidence = calculateConfidence(domResult);
                    if (domConfidence > 0.85) {
                        console.log("\u2705 DOM parsing successful (confidence: ".concat((domConfidence * 100).toFixed(0), "%)"));
                        return [2 /*return*/, {
                                success: true,
                                data: convertFromInternalFormat(domResult),
                                confidence: domConfidence,
                                method: 'dom',
                                cost: 0
                            }];
                    }
                    // Step 2: Fallback to AI
                    console.log("\uD83E\uDD16 DOM confidence low (".concat((domConfidence * 100).toFixed(0), "%), trying AI parser..."));
                    tableHTML = extractTableFromHTML(html);
                    return [4 /*yield*/, parseTableWithAI(tableHTML, sourceUrl)];
                case 1:
                    aiResult = _a.sent();
                    if (aiResult.success) {
                        validation = validateSalaryData(aiResult.data);
                        if (validation.isValid) {
                            console.log("\u2705 AI parsing successful!");
                            return [2 /*return*/, aiResult];
                        }
                        else {
                            console.warn("\u26A0\uFE0F AI parsing had validation errors:", validation.errors);
                            // Return AI result anyway, but with lower confidence
                            return [2 /*return*/, __assign(__assign({}, aiResult), { confidence: 0.7, success: validation.errors.length < 5 // Accept if few errors
                                 })];
                        }
                    }
                    // Step 3: Both failed
                    console.error("\u274C Both DOM and AI parsing failed for ".concat(sourceUrl));
                    return [2 /*return*/, {
                            success: false,
                            data: [],
                            confidence: 0,
                            method: 'dom',
                            cost: aiResult.cost
                        }];
            }
        });
    });
}
exports.hybridParse = hybridParse;
/**
 * Calculate confidence score for DOM parsing result
 */
function calculateConfidence(result) {
    if (!result || typeof result !== 'object')
        return 0;
    var classifications = Object.keys(result);
    if (classifications.length === 0)
        return 0;
    var score = 0.5; // Base score for having data
    // Check if classifications have proper format
    var validCodes = classifications.filter(function (code) { return /^[A-Z]{2,4}(-[A-Z0-9]+)?(-\d+)?$/.test(code); });
    score += (validCodes.length / classifications.length) * 0.2;
    // Check if salaries are in reasonable range
    var reasonableSalaries = 0;
    var totalSalaries = 0;
    classifications.forEach(function (code) {
        var _a;
        var rates = ((_a = result[code]) === null || _a === void 0 ? void 0 : _a['annual-rates-of-pay']) || [];
        rates.forEach(function (rate) {
            Object.keys(rate).forEach(function (key) {
                if (key.startsWith('step-')) {
                    totalSalaries++;
                    var amount = typeof rate[key] === 'number' ? rate[key] : Number(rate[key]);
                    if (amount >= 1 && amount <= 500000) {
                        reasonableSalaries++;
                    }
                }
            });
        });
    });
    if (totalSalaries > 0) {
        score += (reasonableSalaries / totalSalaries) * 0.3;
    }
    return Math.min(score, 1.0);
}
/**
 * Extract table HTML from full page HTML
 */
function extractTableFromHTML(html) {
    // Find all <table> elements
    var tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    var tables = html.match(tableRegex) || [];
    // Return the largest table (likely the salary table)
    var largestTable = '';
    tables.forEach(function (table) {
        if (table.length > largestTable.length) {
            largestTable = table;
        }
    });
    return largestTable || html.substring(0, 10000);
}
/**
 * Convert internal format back to AI format (for confidence calculation)
 */
function convertFromInternalFormat(internalData) {
    var result = [];
    Object.keys(internalData).forEach(function (classification) {
        var rates = internalData[classification]['annual-rates-of-pay'] || [];
        rates.forEach(function (rate) {
            var steps = [];
            Object.keys(rate).forEach(function (key) {
                if (key.startsWith('step-')) {
                    var stepNum = parseInt(key.split('-')[1]);
                    var amount = typeof rate[key] === 'number' ? rate[key] : Number(rate[key]);
                    steps.push({ step: stepNum, amount: amount });
                }
            });
            if (steps.length > 0) {
                result.push({
                    classification: classification,
                    steps: steps.sort(function (a, b) { return a.step - b.step; }),
                    effectiveDate: rate['effective-date'] || '',
                    source: rate._source || ''
                });
            }
        });
    });
    return result;
}
/**
 * Usage tracking for cost monitoring
 */
var AIUsageTracker = /** @class */ (function () {
    function AIUsageTracker() {
        this.totalCost = 0;
        this.callCount = 0;
        this.successCount = 0;
    }
    AIUsageTracker.prototype.trackCall = function (result) {
        this.callCount++;
        this.totalCost += result.cost;
        if (result.success)
            this.successCount++;
    };
    AIUsageTracker.prototype.getStats = function () {
        return {
            totalCalls: this.callCount,
            successfulCalls: this.successCount,
            totalCost: this.totalCost,
            averageCost: this.callCount > 0 ? this.totalCost / this.callCount : 0,
            successRate: this.callCount > 0 ? this.successCount / this.callCount : 0
        };
    };
    AIUsageTracker.prototype.reset = function () {
        this.totalCost = 0;
        this.callCount = 0;
        this.successCount = 0;
    };
    return AIUsageTracker;
}());
exports.AIUsageTracker = AIUsageTracker;
exports.usageTracker = new AIUsageTracker();
