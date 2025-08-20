import React from "react";
import { motion } from "framer-motion";

export function Button({
  variant = "default",
  size = "default",
  className = "",
  asChild = false,
  ...props
}) {
  const base = "btn";
  const variants = { default: "btn-primary", outline: "btn-outline", ghost: "btn-ghost" };
  const sizes = { default: "h-10 px-4", icon: "h-9 w-9 p-0", sm: "h-8 px-3", lg: "h-11 px-5 text-base" };

  const cls = [base, variants[variant] ?? variants.default, sizes[size] ?? sizes.default, "hover:shadow-md", className].join(" ");
  const Comp = asChild ? motion.span : motion.button;

  return <Comp whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} className={cls} {...props} />;
}
export default Button;
