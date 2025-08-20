export function Button({ variant="primary", size="default", className="", asChild=false, ...props }) {
  const base = "btn";
  const variants = { primary: "btn-primary", outline: "btn-outline", ghost: "btn-ghost" };
  const sizes = { default: "h-10 px-4", icon: "h-9 w-9 p-0", sm: "h-8 px-3", lg: "h-11 px-5 text-base" };
  const cls = [base, variants[variant] || variants.primary, sizes[size] || sizes.default, className].join(" ");
  const Comp = asChild ? "span" : "button";
  return <Comp className={cls} {...props} />;
}
