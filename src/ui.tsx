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
      variant === "primary" && "bg-[#140F2D] text-white hover:bg-[#241C46]",
      variant === "coral" && "bg-gradient-to-r from-[#FF6B4A] to-[#D946B0] text-white hover:brightness-105 shadow-sm shadow-[#FF6B4A]/20",
      variant === "outline" && "bg-white text-[#140F2D] border border-gray-200 hover:border-[#FF6B4A] hover:text-[#FF6B4A]",
      variant === "success" && "bg-[#1FC9B7] text-white hover:brightness-95",
      variant === "ghost" && "bg-transparent text-[#FF6B4A] hover:bg-[#FF6B4A]/10",
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
      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#FF6B4A] font-sans transition-colors"
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
        disabled ? "opacity-60 cursor-not-allowed" : "focus:border-[#FF6B4A]"
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
  color?: "navy" | "coral" | "green" | "amber" | "magenta" | "violet" | "teal" | "default";
}) => (
  <span
    className={cn(
      "inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-white border",
      color === "navy" && "text-[#140F2D] border-[#140F2D]/15",
      color === "coral" && "text-[#FF6B4A] border-[#FF6B4A]/20",
      color === "green" && "text-emerald-600 border-emerald-200",
      color === "amber" && "text-amber-600 border-amber-200",
      color === "magenta" && "text-[#D946B0] border-[#D946B0]/20",
      color === "violet" && "text-[#7C5CFC] border-[#7C5CFC]/20",
      color === "teal" && "text-[#1FC9B7] border-[#1FC9B7]/25",
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
  <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", coral ? "text-[#FF6B4A]" : "text-gray-400")}>
    {children}
  </p>
);

export const ROAILogo = ({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) => {
  const s: any = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" };
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center font-black bg-gradient-to-br from-[#FF6B4A] via-[#D946B0] to-[#7C5CFC]",
          size === "sm" ? "w-8 h-8 text-sm" : size === "md" ? "w-10 h-10 text-base" : "w-[3.25rem] h-[3.25rem] text-xl"
        )}
      >
        <span className="text-white font-black" style={{ fontFamily: "var(--font-display)" }}>R</span>
      </div>
      <div>
        <div className={cn("font-black leading-none font-display", s[size], dark ? "text-white" : "text-[#140F2D]")}>
          RoAI<span className="text-[#FF6B4A]">.</span>
        </div>
        <div className={cn("text-[10px] uppercase tracking-widest font-semibold leading-none mt-0.5", dark ? "text-white/40" : "text-gray-400")}>
          Future of Work
        </div>
      </div>
    </div>
  );
};

// Signature hero band — fluid gradient mesh, for landing/entry screens only.
// Keep working screens (forms, lists) plain; this is the one bold moment.
export const GradientHero = ({ children, compact = false }: { children: ReactNode; compact?: boolean }) => (
  <div className={cn("roai-mesh rounded-b-[40px] px-6", compact ? "py-10" : "py-16")}>
    <div className="max-w-lg mx-auto text-center">{children}</div>
  </div>
);
