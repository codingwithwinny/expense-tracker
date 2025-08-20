import React from "react";
export function Card({ className="", ...props }) {
  return <div className={["glass hover-pop", className].join(" ")} {...props} />;
}
export function CardHeader({ className="", ...props }) {
  return <div className={["border-b border-slate-200/70 p-4 bg-white/40 rounded-t-2xl", className].join(" ")} {...props} />;
}
export function CardTitle({ className="", ...props }) {
  return <h3 className={["text-lg font-semibold tracking-tight", className].join(" ")} {...props} />;
}
export function CardContent({ className="", ...props }) {
  return <div className={["p-4", className].join(" ")} {...props} />;
}
