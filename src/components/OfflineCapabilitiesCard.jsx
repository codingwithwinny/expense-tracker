import { Check, Cloud, X } from "lucide-react";

const capabilities = [
  { label: "View your expenses", status: "works" },
  { label: "Add, edit, delete expenses", status: "queued" },
  { label: "Change budgets", status: "queued" },
  { label: "Switch between months", status: "works" },
  { label: "AI Insights", status: "needs-connection" },
  { label: "Quick Add (AI parse)", status: "needs-connection" },
  { label: "Import bank statement", status: "needs-connection" },
];

const STATUS_META = {
  works: {
    icon: Check,
    color: "#34D399",
    bg: "rgba(52,211,153,0.10)",
    label: "Works offline",
  },
  queued: {
    icon: Cloud,
    color: "#818CF8",
    bg: "rgba(129,140,248,0.10)",
    label: "Syncs when back online",
  },
  "needs-connection": {
    icon: X,
    color: "var(--tf)",
    bg: "var(--c6)",
    label: "Needs connection",
  },
};

export default function OfflineCapabilitiesCard() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Cloud className="h-4 w-4" style={{ color: "#818CF8" }} />
        <h2 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
          Works offline
        </h2>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--tf)" }}>
        Ancy keeps working even when your connection drops. Here's what you can do.
      </p>

      <ul className="flex flex-col gap-2">
        {capabilities.map((cap) => {
          const meta = STATUS_META[cap.status];
          const Icon = meta.icon;
          return (
            <li
              key={cap.label}
              className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{
                background: "var(--c4)",
                border: "1px solid var(--bd)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--tm)" }}>
                {cap.label}
              </span>
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ml-3"
                style={{ background: meta.bg, color: meta.color }}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs" style={{ color: "var(--tf)" }}>
        Changes you make offline appear immediately and sync automatically when you reconnect. Your data is stored locally on this device.
      </p>
    </div>
  );
}
