import React, { createContext, useContext, useState } from "react";
const Ctx = createContext(null);

export function Dialog({ children }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}
export function DialogTrigger({ asChild=false, children }) {
  const { setOpen } = useContext(Ctx);
  if (asChild && React.isValidElement(children)) return React.cloneElement(children, { onClick: () => setOpen(true) });
  return <button onClick={() => setOpen(true)}>{children}</button>;
}
export function DialogContent({ children }) {
  const { open, setOpen } = useContext(Ctx);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-[92%] max-w-lg glass p-5 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
export function DialogHeader({ children }) { return <div className="mb-2">{children}</div>; }
export function DialogTitle({ children }) { return <h4 className="text-lg font-semibold">{children}</h4>; }
export function DialogDescription({ children, asChild=false }) {
  return asChild ? <>{children}</> : <p className="text-sm text-slate-600">{children}</p>;
}
export function DialogClose() {
  const { setOpen } = useContext(Ctx);
  return <button className="btn btn-outline mt-3" onClick={() => setOpen(false)}>Close</button>;
}
