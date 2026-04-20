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
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are a friendly personal finance advisor. Analyze this user's spending for ${period} and give 3-4 short, specific, actionable insights. Be conversational, warm, and specific to their actual numbers. Use simple language.

Income: ${currency} ${income.toLocaleString()}
Total Expenses: ${currency} ${totalExpenses.toLocaleString()}
Remaining: ${currency} ${remaining.toLocaleString()}
Savings Rate: ${savingsRate}%

Spending by category:
${summaryText}

Give insights in this format:
- Start with one encouraging sentence about their overall spending
- Point out their biggest spending category and if it seems high or reasonable
- Give one specific money-saving tip based on their actual data
- End with a motivating sentence about their savings

Keep it under 150 words. Do not use markdown headers or bullet points. Write in short paragraphs.`,
        },
      ],
    });

    return {
      insights: response.content[0].text,
      summary: {
        totalExpenses,
        remaining,
        savingsRate,
        topCategory: Object.entries(categoryTotals).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0],
        categoryTotals,
      },
    };
  },
);

/* ─────────────────────────────────────────────
   2. Quick Add — parse multiple expenses from
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
