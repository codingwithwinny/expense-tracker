import { motion } from "framer-motion";

export default function EmptyState({
  icon: Icon,
  heading,
  subtext,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  className = "",
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center text-center px-6 py-12 min-h-[320px] ${className}`}
    >
      {Icon && (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--c6, rgba(255,255,255,0.05))" }}
        >
          <Icon className="h-7 w-7" style={{ color: "var(--tf)" }} />
        </div>
      )}
      <h3
        className="mb-2 text-lg font-semibold"
        style={{ color: "var(--tx)" }}
      >
        {heading}
      </h3>
      {subtext && (
        <p
          className="mb-6 max-w-sm text-sm"
          style={{ color: "var(--tm)" }}
        >
          {subtext}
        </p>
      )}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background: "linear-gradient(135deg, #818CF8 0%, #6366F1 100%)",
            color: "#fff",
          }}
        >
          {ctaLabel}
        </button>
      )}
      {secondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          className="mt-3 text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--tf)" }}
        >
          {secondaryLabel}
        </button>
      )}
    </motion.div>
  );
}
