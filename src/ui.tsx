import { Loader2 } from "lucide-react";
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
  <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>{children}</div>
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
          Future of Work
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
