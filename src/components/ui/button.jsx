import React from "react";

export function Button({
  variant = "default",
  size = "default",
  className = "",
  asChild = false,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition border shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200";

  const variants = {
    default: "bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-transparent hover:opacity-95 active:opacity-90",
    outline: "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
    ghost: "bg-transparent border-transparent hover:bg-gray-100 shadow-none",
  };

  const sizes = {
    default: "h-10 px-4",
    icon: "h-9 w-9 p-0",
    sm: "h-8 px-3",
    lg: "h-11 px-5 text-base",
  };

  const cls = [
    base,
    variants[variant] || variants.default,
    sizes[size] || sizes.default,
    className,
  ].join(" ");

  const Comp = asChild ? "span" : "button";
  return <Comp className={cls} {...props} />;
}

// ✅ Export both named and default so all imports work
export default Button;