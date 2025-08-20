import React from "react";
export function Label({ className="", ...props }) {
  return <label className={"mb-1 block text-xs font-medium text-slate-600 " + className} {...props} />;
}
export default Label;
