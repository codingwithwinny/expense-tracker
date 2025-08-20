import React from "react";
export function Input({ className="", ...props }) {
  return (
    <input
      className={"w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 " + className}
      {...props}
    />
  );
}
export default Input;
