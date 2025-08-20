import React from "react";

function flattenItems(children, acc=[]) {
  React.Children.forEach(children, (child) => {
    if (!child) return;
    if (child.type && child.type.displayName === "SelectItem") acc.push(child);
    if (child.props && child.props.children) flattenItems(child.props.children, acc);
  });
  return acc;
}

export function Select({ value, onValueChange, children }) {
  const items = flattenItems(children);
  return (
    <select
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {items.map((it, i) => (
        <option key={i} value={it.props.value}>{it.props.children}</option>
      ))}
    </select>
  );
}
export function SelectTrigger({ children, ..._ }) { return <>{children}</>; }
export function SelectContent({ children, ..._ }) { return <>{children}</>; }
export function SelectValue({ ..._ }) { return null; }
export function SelectItem({ value, children }) { return null; }
SelectItem.displayName = "SelectItem";
