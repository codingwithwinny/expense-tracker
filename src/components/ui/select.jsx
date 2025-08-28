import React from "react";
function flattenItems(children, acc = []) {
  React.Children.forEach(children, (child) => {
    if (!child) return;
    if (child.type && child.type.displayName === "SelectItem") acc.push(child);
    if (child.props && child.props.children)
      flattenItems(child.props.children, acc);
  });
  return acc;
}
export function Select({ value, onValueChange, children }) {
  const items = flattenItems(children);
  return (
    <select
      className="field appearance-none pr-8 bg-[url('data:image/svg+xml;utf8,<svg fill=%22%23677%22 height=%2220%22 viewBox=%220 0 20 20%22 width=%2220%22 xmlns=%22http://www.w3.org/2000/svg%22><polygon points=%220,0 20,0 10,12%22/></svg>')] bg-[right_0.6rem_center] bg-no-repeat"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {items.map((it, i) => (
        <option key={i} value={it.props.value}>
          {it.props.children}
        </option>
      ))}
    </select>
  );
}
export function SelectTrigger({ children }) {
  return <>{children}</>;
}
export function SelectContent({ children }) {
  return <>{children}</>;
}
export function SelectValue() {
  return null;
}
// eslint-disable-next-line no-unused-vars
export function SelectItem({ value, children }) {
  return null;
}
SelectItem.displayName = "SelectItem";
