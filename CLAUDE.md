# Ancy Expense Tracker — Project Briefing for Claude

This file gives Claude full context about this project so you never need to re-explain it.

---

## What This App Is

**Ancy Expense Tracker** is a personal finance PWA (Progressive Web App) built for Indian users. It lets people track income, expenses, budgets, and savings goals with a beautiful SaaS-style dashboard. It has AI features powered by Claude (Anthropic API) via Firebase Functions.

Live URL: https://ancyexpensetracker.web.app
GitHub: https://github.com/codingwithwinny/expense-tracker

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Bundler | Vite 7 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Charts | Recharts (PieChart, donut style) |
| Icons | lucide-react |
| Auth | Firebase Auth (Google + Email/Password) |
| Database | Firestore (per-user, per-period data) |
| Backend | Firebase Functions v2 (Node.js 24) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| PWA | vite-plugin-pwa + service worker |
| Deployment | Firebase Hosting + GitHub Pages |

---

## Project Structure

```
expense-tracker/
├── src/
│   ├── App.jsx                  # Main UI component (~1000 lines)
│   ├── main.jsx                 # Entry point, SW registration
│   ├── hooks/
│   │   ├── useAuth.js           # Firebase auth state
│   │   ├── useMonthData.js      # Loads/saves period data (local + Firestore)
│   │   ├── useDateSelection.js  # Period selector with localStorage persistence
│   │   └── useCurrency.jsx      # Currency context + selector
│   ├── lib/
│   │   ├── firebase.js          # Firebase init, auth helpers, Firestore helpers, Functions
│   │   ├── utils.js             # fmt(), buildCSV(), periodKey(), monthKey()
│   │   └── constants.js         # DEFAULT_CATEGORIES, MAX_CATEGORIES, COLORS, etc.
│   └── components/
│       ├── AuthPage.jsx         # Login/signup page
│       ├── AuthButtons.jsx      # Sign in/out buttons
│       ├── CurrencySelector.jsx # Globe icon + currency picker
│       └── ui/                  # shadcn-style components
│           ├── card.jsx
│           ├── button.jsx
│           ├── input.jsx
│           ├── label.jsx
│           ├── select.jsx
│           └── dialog.jsx       # IMPORTANT: supports both controlled (open/onOpenChange) and uncontrolled (DialogTrigger) modes
├── functions/
│   ├── index.js                 # Firebase Cloud Functions (AI endpoints)
│   └── package.json             # includes @anthropic-ai/sdk
├── public/                      # PWA assets, manifest
├── firebase.json                # Firebase config (hosting + functions)
├── firestore.rules              # Firestore security rules
└── vite.config.js               # Vite + PWA plugin config
```

---

## Data Model

Data is stored in Firestore at `users/{uid}/months/{periodKey}`.

```javascript
// Period key format: "2024-01" for monthly, "custom_20240901_20241025" for custom range
{
  incomeSources: [{ id, name, amount }],
  expenses: [{ id, date, category, description, amount }],
  catBudgets: { "Groceries": 5000, "Rent": 15000 },
  categories: ["Groceries", "Rent", "Transport", ...],  // user's category list
  savingsGoals: [{ id, name, targetAmount, currentAmount, targetDate, priority, createdAt }],
  updatedAt: serverTimestamp()
}
```

Data is also mirrored in localStorage for offline/fast access. The `useMonthData` hook handles syncing between local and cloud.

---

## Design System

### Theme
The app has a **light/dark theme toggle** stored in `localStorage` as `"ancy-theme"`. Theme state lives in `ThemeContext` in `App.jsx`.

- **Light:** `bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100`
- **Dark:** `bg-[#12141f]` with indigo/violet glow decorations

### Reusable Components (defined in App.jsx)

```jsx
// Glass card — main card container
<GlassCard className="">...</GlassCard>

// Section title with icon
<SectionTitle icon={Wallet} iconColor="text-indigo-500">Income</SectionTitle>

// Theme-aware input
<ThemedInput placeholder="..." value={...} error={!!error} onChange={...} />

// Gradient button (variant: "primary" | "secondary" | "ai")
<GradBtn onClick={...} variant="primary">Add</GradBtn>

// Inline field error
<FieldError message={errors.name} />
```

### Colors
- Primary gradient: `from-indigo-500 to-cyan-500`
- Secondary gradient: `from-green-500 to-emerald-500`
- AI/Purple gradient: `from-violet-500 to-purple-600`
- Error: `text-red-400`, `border-red-500/50` (dark), `border-red-300` (light)

### Category Colors
Categories get stable colors via `colorFor(name)` — a hash function that maps names to the `COLORS` array from constants.

---

## Firebase Functions (AI Backend)

Located in `functions/index.js`. Two endpoints:

### `getSpendingInsights`
Analyzes user expenses and returns a personalized AI summary.
```javascript
// Call from frontend:
import { getSpendingInsightsFn } from "@/lib/firebase";
const result = await getSpendingInsightsFn({ expenses, income, categories, currency, period });
// Returns: { insights: "string", summary: { totalExpenses, remaining, savingsRate, topCategory, categoryTotals } }
```

### `parseExpense`
Parses natural language into a structured expense.
```javascript
// Call from frontend:
import { parseExpenseFn } from "@/lib/firebase";
const result = await parseExpenseFn({ text: "spent 500 on food today", categories, currency });
// Returns: { expense: { amount, category, description, date } }
```

Both functions require Firebase Auth (user must be logged in). The Anthropic API key is stored as a Firebase Secret (`ANTHROPIC_API_KEY`).

Deploy functions with:
```bash
firebase deploy --only functions
```

---

## Key Patterns to Follow

### Adding a new action (e.g. edit expense)
1. Add state in the main `ExpenseTracker` component
2. Write the action function (follows same pattern as `addExpense`, `removeExpense`)
3. Use `openConfirm()` for destructive actions, `openAmountInput()` for number inputs
4. Use `addToast("message", "success")` for feedback
5. Update `setState()` immutably

### Adding a new Firebase Function
1. Add the function in `functions/index.js`
2. Export the callable from `src/lib/firebase.js` using `httpsCallable(functions, "functionName")`
3. Import and use in `App.jsx`
4. Deploy with `firebase deploy --only functions`

### Adding a new section/card
1. Wrap in `<GlassCard className="p-5">`
2. Start with `<SectionTitle icon={...}>Title</SectionTitle>`
3. Use `<ThemedInput>` for all inputs
4. Use `<GradBtn>` for primary actions
5. Wrap in `<motion.div {...stagger(N)}>` for entry animation

---

## What's Already Built ✅

- [x] Authentication (Google + Email/Password)
- [x] Income sources (add/remove)
- [x] Expenses (add/remove, mobile cards + desktop table)
- [x] Category budgets with progress bars (orange at 80%, red when over)
- [x] Custom categories (add/delete)
- [x] Savings goals (add/remove, add money, withdraw)
- [x] Pie/donut chart with legend
- [x] Multi-currency support
- [x] Custom date range selector
- [x] CSV export
- [x] Dark/light theme toggle (persisted)
- [x] Toast notifications
- [x] Confirm modals (no browser alert/confirm/prompt)
- [x] Inline field validation
- [x] PWA (installable, service worker)
- [x] Firebase Hosting deployment
- [x] AI Insights (Claude analyzes spending, gives personalized summary)
- [x] Quick Add (type naturally, Claude parses expense)

---

## What's Next 🚀 (Planned Features)

### High priority
- [ ] **Edit expense** — click a row to edit date/category/amount/description inline
- [ ] **Recurring expenses** — mark an expense as recurring (monthly/weekly), auto-add each period
- [ ] **Onboarding flow** — 3-step setup for new users (set income → pick categories → set first budget)

### Medium priority
- [ ] **Spending trends** — line chart showing expenses across last 6 months (data already exists in Firestore)
- [ ] **PDF/CSV bank statement import** — upload statement, Claude AI extracts all transactions
- [ ] **Budget rollover** — carry unspent budget to next month
- [ ] **Push notifications** — PWA notification when hitting 80% of a budget

### Nice to have
- [ ] **Search/filter expenses** — filter by category, date range, amount
- [ ] **Split expenses** — divide an expense across multiple categories
- [ ] **Notes per period** — free-text notes for a month

---

## Commands

```bash
# Development
npm run dev                      # Start local dev server at localhost:5173

# Deployment
npm run deploy:firebase          # Build + deploy to Firebase Hosting
firebase deploy --only functions # Deploy only Cloud Functions
git add . && git commit -m "..." && git push  # Save to GitHub

# Firebase
firebase login --reauth          # Re-authenticate if 401 errors
firebase functions:secrets:set ANTHROPIC_API_KEY  # Update API key
```

---

## Important Notes for Claude

1. **Never change business logic** unless explicitly asked — only UI/UX changes when doing design work
2. **The `dialog.jsx` component** supports both controlled (`open` + `onOpenChange` props) and uncontrolled (`DialogTrigger`) modes — do not break this
3. **Always use `ThemedInput`, `GlassCard`, `GradBtn`** — never raw `<input>` or `<button>` tags in new UI
4. **Dark mode must work** — every new component needs both light and dark variants using the `t` object or `useTheme()` hook
5. **All destructive actions** must use `openConfirm()` — never `window.confirm()`
6. **All user feedback** must use `addToast()` — never `window.alert()`
7. **Framer Motion** — wrap new sections in `<motion.div {...stagger(N)}>` for entry animations
8. **Firebase Functions** use Node.js 24 and Firebase Functions v2 (`firebase-functions/v2/https`)
9. The app is for **Indian users primarily** — default currency context is INR, date format is en-IN
