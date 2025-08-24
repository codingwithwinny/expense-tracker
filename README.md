Ancy Expense Tracker (PWA)

A fast, modern expense tracker built with React + Vite and designed for mobile & desktop.
Track income, expenses, and category budgets, visualize spending with a pie chart, export CSVs, and (optionally) sign in with Google to sync data to Firebase Firestore. Works offline as a Progressive Web App.

<p align="center">
  <img src="public/og-screenshot.png" alt="App screenshot" width="780" />
</p>

<div align="center">

</div>

⸻

✨ Features
• Multi-source income (salary, freelance, etc.)
• Expense tracking with date, category, description, amount
• Custom categories with per-category budgets
• Visual breakdown by category (Recharts PieChart)
• CSV export of expenses
• Authentication: Google Sign-In (optional)
• Cloud sync: per-month data saved to Firestore (optional)
• Offline-first PWA: installable and works without a network
• Beautiful UI: Tailwind + shadcn/ui, responsive and keyboard-friendly

⸻

🧱 Tech Stack
• Frontend: React 18, Vite, TailwindCSS, shadcn/ui, Framer Motion
• Charts: Recharts
• State & Data: Local storage + Firebase Firestore (optional)
• Auth: Firebase Authentication (Google)
• Build & Deploy: Vite, Firebase Hosting
• PWA: vite-plugin-pwa

⸻

🚀 Getting Started

1. Clone & Install

git clone https://github.com/<your-username>/expense-tracker.git
cd expense-tracker
npm ci # or: npm install

2. Environment Variables

Create .env (copy from .env.example) and fill in your Firebase project values:

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

You can find these in Firebase Console → Project Settings → General → “Your apps”.

3. Run Dev Server

npm run dev

# http://localhost:5173

⸻

🔥 Firebase Setup (Optional but recommended) 1. Create a Firebase project and enable:
• Authentication → Sign-in method → Google → Enable
• Firestore Database → Start in production mode
• Hosting (optional for deployment) 2. Install Firebase CLI (once):

npm i -g firebase-tools
firebase login

    3.	Initialize Hosting (in this repo):

firebase init hosting

# Public directory: dist

# SPA rewrite all to /index.html: Yes

    4.	Build & Deploy

npm run build
firebase deploy --only hosting

Custom Domain (Firebase Hosting)
• Add your domain in Hosting → Custom domains, follow the CNAME instructions.
• When the domain shows Connected, deploy your site.
• If you see “Site Not Found”, it usually means you connected DNS but haven’t deployed yet (or you’re viewing a cached 404). Deploy then test in Incognito.

⸻

📦 Project Scripts

# Start dev server

npm run dev

# Production build

npm run build

# Preview dist locally (optional)

npm run preview

⸻

📁 Project Structure

src/
components/
AuthButtons.jsx # Google sign-in / sign-out
ui/ # shadcn/ui primitives (Button, Card, etc.)
hooks/
useAuth.js # Firebase Auth helper
useMonthData.js # Load/save month data (local + Firestore)
lib/
constants.js # Categories, limits, colors
firebase.js # Firebase init
utils.js # fmt(), monthKey(), CSV builder
App.jsx # Main UI
index.css # Tailwind entry + custom styles
vite.config.js # Vite + PWA config

⸻

📱 PWA
• This app is PWA-ready via vite-plugin-pwa.
• On build, a service worker + manifest are generated.
• You can “Install” the app on desktop/mobile for an app-like experience.

⸻

🧭 Common Pitfalls & Fixes
• Tailwind error: Cannot apply unknown utility class 'text-navy'
Tailwind only knows built-in classes. Either:
• Replace with a built-in (text-slate-900, text-indigo-900, etc.), or
• Extend Tailwind in tailwind.config.js:

theme: {
extend: {
colors: { navy: "#0b1b34" }
}
}

Restart Vite after changing the config.

    •	Vite/Babel: “Identifier ‘fmt’ has already been declared.”

You’re importing fmt from @/lib/utils and also declaring a local fmt. Remove the local const fmt = … or rename it.
• JSX: “Adjacent JSX elements must be wrapped…”
Wrap siblings in a fragment <>...</> or ensure there’s a single parent.
Example: a progress bar should render one inner bar div inside the track.
• Button attribute typo
Use className="gap-2 whitespace-nowrap" instead of className="gap-2" whitespace-nowrap.
• Custom Domain shows “Site Not Found”
DNS may be connected but you haven’t deployed the app yet. Run:

npm run build
firebase deploy --only hosting

Then test in Incognito.

⸻

🧪 Data Model (Firestore)

Per user & month (example path):

users/{uid}/months/{YYYY-MM}
{
incomeSources: [{ id, name, amount }],
expenses: [{ id, date(YYYY-MM-DD), category, description, amount }],
catBudgets: { [categoryName]: number },
categories: [ "Groceries", "Transport", ... ]
}

    •	Local state is always kept; Firestore sync is best-effort when signed in.
    •	Changing the selected month loads/saves a separate document.

⸻

🗺️ Roadmap
• Dark mode
• Monthly roll-ups & trends
• Recurring expenses
• Multi-currency support
• Better code-splitting & bundle size

⸻

🤝 Contributing 1. Fork & create a feature branch: git checkout -b feature/awesome-thing 2. Commit with clear messages 3. Open a PR against main

⸻

📝 License

MIT © You

⸻

🙌 Acknowledgements
• shadcn/ui for clean, composable UI primitives
• Recharts for simple charts
• Vite for the instant dev server
• Firebase for Auth, Firestore, and Hosting

⸻

Screenshots:

public/og-screenshot.png # main screenshot
public/mobile-shot.png # mobile layout
