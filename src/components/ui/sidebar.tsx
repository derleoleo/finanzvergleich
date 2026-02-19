import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx)
    throw new Error(
      "Sidebar components must be used within <SidebarProvider>."
    );
  return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
    }),
    [open]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function Sidebar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={[
          "z-50 md:z-auto",
          "fixed md:static inset-y-0 left-0",
          "w-80 max-w-[85vw] md:w-80",
          "transform md:transform-none transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className,
        ].join(" ")}
      >
        {children}
      </aside>
    </>
  );
}

export function SidebarTrigger({ className = "" }: { className?: string }) {
  const { toggle } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        "inline-flex items-center justify-center",
        "rounded-lg border border-slate-200 bg-white",
        "px-3 py-2 text-slate-700",
        "hover:bg-slate-50 active:bg-slate-100",
        className,
      ].join(" ")}
      aria-label="Sidebar öffnen/schließen"
    >
      ☰
    </button>
  );
}

export function SidebarHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarGroupLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarGroupContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarMenu({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SidebarMenuItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/**
 * asChild: Wenn true, erwartet genau 1 ReactElement (z.B. <Link/>).
 * Wir klonen es und hängen className dran.
 */
export function SidebarMenuButton({
  children,
  className = "",
  asChild = false,
}: {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  if (asChild) {
    if (!React.isValidElement(children)) {
      return <>{children}</>;
    }

    const child = children as ReactElement<any>;
    const merged = [child.props?.className ?? "", className].join(" ").trim();

    return React.cloneElement(child, { className: merged });
  }

  return (
    <button
      type="button"
      className={[
        "w-full text-left",
        "inline-flex items-center",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
