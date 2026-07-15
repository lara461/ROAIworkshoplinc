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
      "inline-flex items-center gap-2 font-bold text-sm rounded-xl px-4 py-2.5 transition-all border-0 cursor-pointer",
      variant === "primary" && "bg-[#0A0E2A] text-white hover:bg-[#1a2040]",
      variant === "coral" && "bg-[#E8503A] text-white hover:bg-[#d4432f]",
      variant === "outline" && "bg-white text-[#0A0E2A] border border-gray-200 hover:border-[#E8503A] hover:text-[#E8503A]",
      variant === "success" && "bg-green-600 text-white hover:bg-green-700",
      variant === "ghost" && "bg-transparent text-[#E8503A] hover:bg-[#E8503A]/10",
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
      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] font-sans transition-colors"
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
        "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none font-sans resize-none transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "focus:border-[#E8503A]"
      )}
    />
  </div>
);

export const Tag = ({
  children,
  color = "default",
}: {
  children: ReactNode;
  color?: "navy" | "coral" | "green" | "amber" | "default";
}) => (
  <span
    className={cn(
      "inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
      color === "navy" && "bg-[#0A0E2A]/10 text-[#0A0E2A]",
      color === "coral" && "bg-[#E8503A]/10 text-[#E8503A]",
      color === "green" && "bg-green-100 text-green-700",
      color === "amber" && "bg-amber-100 text-amber-700",
      color === "default" && "bg-gray-100 text-gray-500"
    )}
  >
    {children}
  </span>
);

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-2xl border border-gray-200 p-6", className)}>{children}</div>
);

export const Eyebrow = ({ children, coral = false }: { children: ReactNode; coral?: boolean }) => (
  <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", coral ? "text-[#E8503A]" : "text-gray-400")}>
    {children}
  </p>
);

export const ROAILogo = ({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) => {
  const s: any = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" };
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-lg flex items-center justify-center font-black bg-[#E8503A]",
          size === "sm" ? "w-7 h-7 text-sm" : size === "md" ? "w-9 h-9 text-base" : "w-12 h-12 text-xl"
        )}
      >
        <span className="text-white font-black" style={{ fontFamily: "Georgia, serif" }}>R</span>
      </div>
      <div>
        <div className={cn("font-black leading-none", s[size], dark ? "text-white" : "text-[#0A0E2A]")}>
          RoAI<span className="text-[#E8503A]">.</span>
        </div>
        <div className={cn("text-[10px] uppercase tracking-widest font-semibold leading-none mt-0.5", dark ? "text-white/40" : "text-gray-400")}>
          Future of Work
        </div>
      </div>
    </div>
  );
};
