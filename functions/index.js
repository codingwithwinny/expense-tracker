const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/* ─────────────────────────────────────────────
   1. AI Monthly Insights
───────────────────────────────────────────── */
exports.getSpendingInsights = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    invoker: "public",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const {
      expenses = [],
      income = 0,
      categories = [],
      currency = "INR",
      period = "this month",
    } = request.data;

    if (expenses.length === 0) {
      throw new HttpsError("invalid-argument", "No expenses to analyze.");
    }

    const categoryTotals = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const summaryText = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: ${currency} ${amt.toLocaleString()}`)
      .join("\n");

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = income - totalExpenses;
    const savingsRate =
      income > 0 ? ((remaining / income) * 100).toFixed(1) : 0;

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 900,
      system: "You are a personal finance analyst. Return ONLY valid JSON — no markdown, no backticks, no explanation.",
      messages: [
        {
          role: "user",
          content: `Analyze this user's spending for ${period} and return a JSON object with exactly this structure:

{
  "anomalies": [
    {
      "id": "unique_snake_case_id",
      "severity": "high" | "medium" | "low",
      "title": "Short title (3-5 words)",
      "description": "One sentence explaining the anomaly with specific numbers.",
      "category": "Category name or null",
      "amount": <number or null>,
      "comparedTo": "Brief comparison context or null"
    }
  ],
  "personality": {
    "archetype": "The [Archetype Name]",
    "tagline": "One punchy sentence that captures their style.",
    "summary": "2-3 sentences about their spending personality, patterns, and one concrete suggestion.",
    "traits": [
      { "label": "Trait label", "value": "Short value or descriptor" }
    ]
  }
}

Rules:
- anomalies: 2-4 items. Focus on spikes, unusual patterns, overspending vs income, or unusually good behavior.
- severity "high" = urgent concern, "medium" = worth noting, "low" = minor observation or positive callout.
- id: unique short snake_case string for each anomaly (e.g. "high_food_spend", "low_savings_rate").
- comparedTo: brief context like "typical 20% of income" or "last month avg" — null if not applicable.
- personality.archetype must be creative and fun (e.g. "The Weekend Splurger", "The Disciplined Saver", "The Foodie Adventurer").
- traits: 3-4 items with a short label and value (e.g. {"label":"Top Category","value":"Dining"}).
- Be specific — reference actual categories and amounts from the data.
- Use ${currency} currency code when mentioning amounts in descriptions.

Data:
Income: ${currency} ${income.toLocaleString()}
Total Expenses: ${currency} ${totalExpenses.toLocaleString()}
Remaining: ${currency} ${remaining.toLocaleString()}
Savings Rate: ${savingsRate}%

Spending by category:
${summaryText}`,
        },
      ],
    });

    const summary = {
      totalExpenses,
      remaining,
      savingsRate,
      topCategory: Object.entries(categoryTotals).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0],
      categoryTotals,
    };

    const rawText = response.content[0].text;
    console.log("[getSpendingInsights] Raw response:", rawText);

    let parsed;
    try {
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("No JSON object found in response");
      }
      const jsonStr = rawText.slice(firstBrace, lastBrace + 1);
      parsed = JSON.parse(jsonStr);
      console.log("[getSpendingInsights] Parsed. Anomalies:", parsed.anomalies?.length, "Personality:", !!parsed.personality);
    } catch (err) {
      console.error("[getSpendingInsights] Parse failed:", err.message);
      console.error("[getSpendingInsights] Raw text:", rawText);
      return { insights: { anomalies: [], personality: null, summary } };
    }

    return {
      insights: {
        anomalies: parsed.anomalies || [],
        personality: parsed.personality || null,
        summary,
      },
    };
  },
);

/* ─────────────────────────────────────────────
   2. Bank Statement Import — parse transactions
      from extracted statement text
───────────────────────────────────────────── */
exports.parseBankStatement = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    invoker: "public",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const { fileText, categories = [], currency = "INR" } = request.data;

    if (!fileText?.trim()) {
      throw new HttpsError("invalid-argument", "No statement text provided.");
    }
    if (fileText.length > 200000) {
      throw new HttpsError(
        "invalid-argument",
        "Statement too large (over 200 KB). Try a shorter date range or export fewer months.",
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let response;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        system:
          "You are a bank statement parser. Extract ALL expense/debit transactions. Return ONLY valid JSON — no markdown, no backticks, no explanation.",
        messages: [
          {
            role: "user",
            content: `Parse this bank statement and extract all DEBIT transactions (expenses only — skip credits, deposits, refunds).

Auto-categorize each into one of: ${categories.join(", ")}. Use "Other" if unsure.

Return ONLY this JSON structure:
{
  "transactions": [
    {"date": "YYYY-MM-DD", "amount": 500, "category": "Groceries", "description": "Short description"}
  ],
  "summary": {
    "bank": "Bank name if identifiable, else null",
    "period": "Statement period if identifiable, else null",
    "currency": "${currency}",
    "total": 0
  }
}

Rules:
- amount: positive number (debit amount, no currency symbols)
- date: YYYY-MM-DD (use ${today} if unclear)
- Only include debits/expenses — never credits or deposits
- description: clean, concise, max 60 chars
- summary.total: sum of all transaction amounts

Statement:
${fileText}`,
          },
        ],
      });
    } catch (apiErr) {
      const status = apiErr.status;
      if (status === 401) {
        throw new HttpsError("unauthenticated", "API key invalid or missing. Please contact support.");
      }
      if (status === 429) {
        throw new HttpsError("resource-exhausted", "AI rate limit reached. Please wait a moment and try again.");
      }
      if (status === 404) {
        throw new HttpsError("not-found", "AI model unavailable. Please contact support.");
      }
      if (status === 413 || (apiErr.message || "").includes("too large")) {
        throw new HttpsError("invalid-argument", "Statement too large for AI processing. Try a shorter date range.");
      }
      throw new HttpsError("internal", `AI request failed: ${apiErr.message || "Unknown error"}`);
    }

    try {
      const raw = response.content[0].text.trim().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      const transactions = (parsed.transactions || []).filter(
        (tx) => Number(tx.amount) > 0 && tx.date,
      );
      if (transactions.length === 0) {
        throw new HttpsError(
          "not-found",
          "No debit transactions found. Check that the file contains expense data.",
        );
      }
      return { transactions, summary: parsed.summary || null };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError(
        "internal",
        "Could not parse the AI response. Please try a different file format.",
      );
    }
  },
);

/* ─────────────────────────────────────────────
   3. Quick Add — parse multiple expenses from
      natural language (max 5 expenses)
───────────────────────────────────────────── */
exports.parseExpense = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    invoker: "public",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const { text, categories = [], currency = "INR" } = request.data;

    if (!text?.trim()) {
      throw new HttpsError("invalid-argument", "Please provide expense text.");
    }

    if (text.length > 300) {
      throw new HttpsError(
        "invalid-argument",
        "Input too long. Keep it under 300 characters.",
      );
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const today = new Date().toISOString().slice(0, 10);

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Extract ALL expense entries from this text and return ONLY a JSON array, nothing else. No markdown, no backticks, just raw JSON.

Text: "${text}"
Today's date: ${today}
Yesterday's date: ${yesterdayStr}
Available categories: ${categories.join(", ")}
Currency: ${currency}

Return a JSON array of expense objects. Each object must have exactly this format:
{
  "amount": <number>,
  "category": "<one of the available categories that best fits>",
  "description": "<short description, under 5 words>",
  "date": "<YYYY-MM-DD format>",
  "isRecurring": <true or false>,
  "frequency": "<daily, weekly, monthly, or yearly — only if isRecurring is true, otherwise null>"
}

Rules:
- Extract EVERY expense mentioned in the text (maximum 5)
- amount must be a number (no currency symbols)
- category must exactly match one from the available categories list — pick the closest match
- if no date mentioned, use today (${today})
- if "yesterday" mentioned for that item, use ${yesterdayStr}
- description should be concise (under 5 words)
- if only one expense is mentioned, still return an array with one item
- return ONLY the JSON array, nothing else, no explanation
- if the text contains words like "every month", "monthly", "weekly", "every week", "daily", "every day", "yearly", "recurring", "regular" — set isRecurring to true and set the appropriate frequency
- if no recurring intent is detected, set isRecurring to false and frequency to null

Example output for "spent 400 on coffee and 1000 on groceries":
[{"amount":400,"category":"Dining","description":"Coffee","date":"${today}"},{"amount":1000,"category":"Groceries","description":"Groceries","date":"${today}"}]`,
        },
      ],
    });

    try {
      const rawText = response.content[0].text.trim();
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Ensure it's an array
      const expenses = Array.isArray(parsed) ? parsed : [parsed];

      // Enforce max 5 limit
      const limited = expenses.slice(0, 5);

      // Validate each expense
      const validated = limited
        .filter(
          (e) => e.amount && !isNaN(Number(e.amount)) && Number(e.amount) > 0,
        )
        .map((e) => ({
          amount: Number(e.amount),
          category: categories.includes(e.category)
            ? e.category
            : categories[0] || "Other",
          description: e.description || "",
          date: e.date || today,
          isRecurring: e.isRecurring === true,
          frequency: e.frequency || null,
        }));

      if (validated.length === 0) {
        throw new HttpsError(
          "internal",
          "Could not find any valid expenses. Try: 'spent 500 on groceries today'",
        );
      }

      return { expenses: validated };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError(
        "internal",
        "Could not parse expenses. Try: 'spent 500 on groceries, 200 on coffee'",
      );
    }
  },
);
