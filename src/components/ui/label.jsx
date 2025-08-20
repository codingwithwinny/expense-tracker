import React from "react";
export function Label({ className="", ...props }) {
  return <label className={["mb-1 block text-xs font-semibold text-slate-600", className].join(" ")} {...props} />;
}
export default Label;
