import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "secondary";
  size?: "sm" | "md";
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const base = "rounded font-medium transition-colors disabled:opacity-50";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border",
  };
  return <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props} />;
}
