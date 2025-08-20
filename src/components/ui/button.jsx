import React from "react";

export function Button({ variant="default", size="default", className="", asChild=false, ...props }) {
  const base = "inline-flex items-center justify-center rounded-2xl font-medium transition border shadow-sm";
  const variants = {
    default: "bg-slate-900 text-white hover:opacity-90 border-slate-900",
    outline: "bg-white text-slate-900 hover:bg-slate-50 border-slate-200",
    ghost: "bg-transparent hover:bg-slate-100 border-transparent shadow-none",
  };
  const sizes = {
    default: "h-10 px-4 text-sm",
    icon: "h-9 w-9 p-0",
    sm: "h-8 px-3 text-sm",
    lg: "h-11 px-5 text-base",
  };
  const cls = [base, variants[variant] || variants.default, sizes[size] || sizes.default, className].join(" ");
  const Comp = asChild ? "span" : "button";
  return <Comp className={cls} {...props} />;
}
export default Button;
