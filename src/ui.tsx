import { ChevronDown, Loader2, Star, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "./utils";

export const Btn = ({
  onClick,
  children,
  variant = "primary",
  className = "",
  loading = false,
  disabled = false,
  type,
}: {
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "coral" | "outline" | "success" | "ghost" | "danger";
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) => (
  <button
    type={type || "button"}
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center gap-2 font-semibold text-sm rounded-lg px-4 py-2 transition-colors border cursor-pointer",
      variant === "primary" && "bg-[#14121F] text-white border-[#14121F] hover:bg-[#262238]",
      variant === "coral" && "bg-[#DD4B4E] text-white border-[#DD4B4E] hover:bg-[#C7383B]",
      variant === "outline" && "bg-white text-[#14121F] border-gray-200 hover:border-gray-300",
      variant === "success" && "bg-[#1FA398] text-white border-[#1FA398] hover:brightness-95",
      variant === "ghost" && "bg-transparent text-[#DD4B4E] border-transparent hover:bg-[#DD4B4E]/5",
      variant === "danger" && "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
      (disabled || loading) && "opacity-50 cursor-not-allowed",
      className
    )}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
  </button>
);

export const Field = ({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div>
    {label && <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#DD4B4E] font-sans transition-colors"
    />
  </div>
);

export const TextArea = ({
  label,
  value,
  onChange,
  rows = 4,
  placeholder = "",
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div>
    {label && <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none font-sans resize-none transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "focus:border-[#DD4B4E]"
      )}
    />
  </div>
);

// Small, quiet pill — matching the muted tool-badges look (asana / slack / notion)
export const Tag = ({
  children,
  color = "default",
}: {
  children: ReactNode;
  color?: "navy" | "coral" | "green" | "amber" | "indigo" | "teal" | "default";
}) => (
  <span
    className={cn(
      "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border",
      color === "navy" && "bg-gray-50 text-[#14121F] border-gray-200",
      color === "coral" && "bg-[#DD4B4E]/8 text-[#DD4B4E] border-[#DD4B4E]/15",
      color === "green" && "bg-emerald-50 text-emerald-600 border-emerald-200",
      color === "amber" && "bg-amber-50 text-amber-600 border-amber-200",
      color === "indigo" && "bg-[#3545A3]/8 text-[#3545A3] border-[#3545A3]/15",
      color === "teal" && "bg-[#1FA398]/8 text-[#1FA398] border-[#1FA398]/20",
      color === "default" && "bg-gray-50 text-gray-500 border-gray-200"
    )}
  >
    {children}
  </span>
);

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-gray-200 p-4 sm:p-6", className)}>{children}</div>
);

// Small, consistent marker for "this person is the facilitator" — used
// inline next to a name. Same visual language as Tag (coral, small,
// bordered) instead of a bare unicode star.
export const FacilitatorBadge = () => (
  <span
    title="Facilitator"
    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#DD4B4E]/10 text-[#DD4B4E] shrink-0"
  >
    <Star className="w-2.5 h-2.5 fill-current" />
  </span>
);

// Simple underline tabs for step-by-step flows. A step can be `locked` —
// e.g. because a prior step isn't done yet — in which case it can't be
// clicked. Reusable anywhere a section has this kind of ordered sub-flow.
export const StepTabs = ({
  steps,
  active,
  onChange,
  right,
}: {
  steps: { key: string; label: string; locked?: boolean; lockedReason?: string }[];
  active: string;
  onChange: (key: string) => void;
  right?: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-gray-200 mb-6">
    <div className="flex gap-6 overflow-x-auto no-scrollbar">
      {steps.map((s, i) => {
        const isActive = s.key === active;
        return (
          <button
            key={s.key}
            onClick={() => !s.locked && onChange(s.key)}
            disabled={s.locked}
            title={s.locked ? s.lockedReason : undefined}
            className={cn(
              "pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              isActive
                ? "border-[#DD4B4E] text-[#14121F]"
                : s.locked
                ? "border-transparent text-gray-300 cursor-not-allowed"
                : "border-transparent text-gray-400 hover:text-gray-600 cursor-pointer"
            )}
          >
            <span className="text-xs text-gray-400">{i + 1}.</span>
            {s.label}
          </button>
        );
      })}
    </div>
    {right && <div className="pb-2 shrink-0">{right}</div>}
  </div>
);

// Simple centered overlay for drill-into-detail views (e.g. a group's
// progress) that should keep the board/list behind visible in context
// rather than navigating away from it.
// Brief bottom-center confirmation message (e.g. "Link copied!") — pass null
// to render nothing. Caller is responsible for clearing it after a timeout.
export const Toast = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#14121F] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none">
      {message}
    </div>
  );
};

export const Modal = ({
  title,
  onClose,
  children,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
    <div
      className="bg-white rounded-xl border border-gray-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-8"
      onClick={(e) => e.stopPropagation()}
    >
      {title && (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#14121F]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {children}
    </div>
  </div>
);

// A single collapsible row/panel — header always visible, body toggles.
// Use for lists where each item has more detail than fits inline
// (participants, groups) so the list stays scannable by default.
export const Accordion = ({
  title,
  subtitle,
  right,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="w-full flex items-center justify-between px-4 py-3 gap-3">
        <button onClick={() => setOpen((o) => !o)} className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer">
          <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
          <div className="min-w-0">
            <div className="font-semibold text-sm text-[#14121F] truncate">{title}</div>
            {subtitle && <div className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</div>}
          </div>
        </button>
        {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
      </div>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// Consistent one-line (or short paragraph) explanation shown at the top of
// every admin tab, right below the tab bar — describes what the tab is for
// and what to do, without repeating the tab's own title.
export const TabIntro = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-gray-500 mb-6 max-w-2xl">{children}</p>
);

export const Eyebrow = ({ children, coral = false }: { children: ReactNode; coral?: boolean }) => (
  <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1", coral ? "text-[#DD4B4E]" : "text-gray-400")}>
    {children}
  </p>
);

export const ROAILogo = ({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) => {
  const s: any = { sm: "text-base", md: "text-lg", lg: "text-xl" };
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "roai-mark rounded-lg flex items-center justify-center font-black shrink-0",
          size === "sm" ? "w-7 h-7 text-xs" : size === "md" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base"
        )}
      >
        <span className="text-white font-black">R</span>
      </div>
      <div>
        <div className={cn("font-black leading-none", s[size], dark ? "text-white" : "text-[#14121F]")}>
          RoAI<span className="text-[#DD4B4E]">.</span>
        </div>
        <div className={cn("text-[9px] uppercase tracking-wider font-semibold leading-none mt-0.5", dark ? "text-white/40" : "text-gray-400")}>
          AI-Native Workshop
        </div>
      </div>
    </div>
  );
};

// Plain page header — small breadcrumb-style row, then a bold title.
// No color band; the reference direction is quiet, product-like, and lets
// color show up only on small accents (icons, active nav states, tags).
export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
    <div>
      {eyebrow && <p className="text-xs font-semibold text-gray-400 mb-1">{eyebrow}</p>}
      <h1 className="text-2xl font-black text-[#14121F]">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-md">{subtitle}</p>}
    </div>
    {right}
  </div>
);
