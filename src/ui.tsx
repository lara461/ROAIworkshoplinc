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
      "inline-flex items-center gap-2 font-bold text-sm rounded-full px-5 py-2.5 transition-all border-0 cursor-pointer tracking-tight",
      variant === "primary" && "bg-[#191534] text-white hover:bg-[#262052]",
      variant === "coral" && "bg-gradient-to-r from-[#3545A3] to-[#DD4B4E] text-white hover:brightness-105 shadow-sm shadow-[#DD4B4E]/20",
      variant === "outline" && "bg-white text-[#191534] border border-gray-200 hover:border-[#DD4B4E] hover:text-[#DD4B4E]",
      variant === "success" && "bg-[#1FA398] text-white hover:brightness-95",
      variant === "ghost" && "bg-transparent text-[#DD4B4E] hover:bg-[#DD4B4E]/10",
      variant === "danger" && "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
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
    {label && <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#DD4B4E] font-sans transition-colors"
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
    {label && <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none font-sans resize-none transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "focus:border-[#DD4B4E]"
      )}
    />
  </div>
);

// White pill, bold colored text — the "60 Best Website Design" reference look.
export const Tag = ({
  children,
  color = "default",
}: {
  children: ReactNode;
  color?: "navy" | "coral" | "green" | "amber" | "indigo" | "teal" | "default";
}) => (
  <span
    className={cn(
      "inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-white border",
      color === "navy" && "text-[#191534] border-[#191534]/15",
      color === "coral" && "text-[#DD4B4E] border-[#DD4B4E]/20",
      color === "green" && "text-emerald-600 border-emerald-200",
      color === "amber" && "text-amber-600 border-amber-200",
      color === "indigo" && "text-[#3545A3] border-[#3545A3]/20",
      color === "teal" && "text-[#1FA398] border-[#1FA398]/25",
      color === "default" && "text-gray-500 border-gray-200"
    )}
  >
    {children}
  </span>
);

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-[28px] border border-gray-200 p-6", className)}>{children}</div>
);

export const Eyebrow = ({ children, coral = false }: { children: ReactNode; coral?: boolean }) => (
  <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", coral ? "text-[#DD4B4E]" : "text-gray-400")}>
    {children}
  </p>
);

export const ROAILogo = ({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) => {
  const s: any = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" };
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center font-black bg-gradient-to-br from-[#3545A3] to-[#DD4B4E]",
          size === "sm" ? "w-8 h-8 text-sm" : size === "md" ? "w-10 h-10 text-base" : "w-[3.25rem] h-[3.25rem] text-xl"
        )}
      >
        <span className="text-white font-semibold" style={{ fontFamily: "var(--font-display)" }}>R</span>
      </div>
      <div>
        <div className={cn("font-semibold leading-none font-display", s[size], dark ? "text-white" : "text-[#191534]")}>
          RoAI<span className="text-[#DD4B4E]">.</span>
        </div>
        <div className={cn("text-[10px] uppercase tracking-widest font-semibold leading-none mt-0.5", dark ? "text-white/40" : "text-gray-400")}>
          Future of Work
        </div>
      </div>
    </div>
  );
};

// Signature band — the logo's own indigo→coral gradient, kept slim.
// Two real breakpoints: mobile stacks tight and centered when there's no
// title; desktop opens up into a wide, generously-spaced left-aligned
// block (logo + nav row, then a big headline), never just a scaled-down
// copy of the same layout.
export const GradientHero = ({
  eyebrow,
  title,
  subtitle,
  topRight,
  align = "left",
  children,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  topRight?: ReactNode;
  align?: "left" | "center";
  children?: ReactNode;
}) => (
  <div className={cn("roai-mesh rounded-b-[28px] md:rounded-b-[36px] px-6 md:px-14", title ? "py-10 md:py-16" : "py-8")}>
    <div className="max-w-5xl mx-auto">
      <div className={cn("flex items-center", title ? "justify-between" : "justify-center")}>
        <ROAILogo dark size={title ? "sm" : "lg"} />
        {topRight}
      </div>
      {title && (
        <div
          className={cn(
            "mt-8 md:mt-16",
            align === "center" ? "text-center mx-auto max-w-sm" : "text-left max-w-xl md:max-w-2xl"
          )}
        >
          {eyebrow && (
            <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/50 font-bold mb-2 md:mb-3">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl md:text-6xl font-semibold text-white leading-[1.05]">{title}</h1>
          {subtitle && <p className="text-white/60 text-sm md:text-base mt-3 md:mt-5 max-w-md">{subtitle}</p>}
          {children && <div className="mt-6 md:mt-8">{children}</div>}
        </div>
      )}
    </div>
  </div>
);
