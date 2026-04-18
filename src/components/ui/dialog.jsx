import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const Ctx = createContext(null);

/**
 * Supports both patterns:
 * - Uncontrolled: <Dialog><DialogTrigger />…</Dialog> (internal open state)
 * - Controlled: <Dialog open={bool} onOpenChange={fn}>…</Dialog> (parent state)
 */
export function Dialog({ children, open: openProp, onOpenChange, defaultOpen = false }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function DialogTrigger({ asChild = false, children }) {
  const { setOpen } = useContext(Ctx);
  const open = () => setOpen(true);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        if (!e.defaultPrevented) open();
      },
    });
  }
  return (
    <button type="button" onClick={open}>
      {children}
    </button>
  );
}

export function DialogContent({ children, className = "" }) {
  const { open, setOpen } = useContext(Ctx);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className={`relative z-10 w-[92%] glass p-5 shadow-2xl ${className || "max-w-lg"}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
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
  return (
    <button
      type="button"
      className="btn btn-outline mt-3"
      onClick={() => setOpen(false)}
    >
      Close
    </button>
  );
}
