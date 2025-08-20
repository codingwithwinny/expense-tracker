import React from "react";
export function Input({ className="", ...props }) {
  return <input className={["field", className].join(" ")} {...props} />;
}
export default Input;
