import { BookOpen, Leaf, Sparkles, Zap } from "lucide-react";
import type { AvatarColor, AvatarIcon } from "@/types/profile";

const icons = { sparkles: Sparkles, book: BookOpen, bolt: Zap, leaf: Leaf };
const colors: Record<AvatarColor, string> = {
  blue: "border-blue-200 bg-blue-100 text-blue-700",
  violet: "border-violet-200 bg-violet-100 text-violet-700",
  coral: "border-rose-200 bg-rose-100 text-rose-700",
  green: "border-emerald-200 bg-emerald-100 text-emerald-700",
};

export function AvatarMark({ icon, color, size = "md", label = "Profile avatar" }: {
  icon: AvatarIcon;
  color: AvatarColor;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const Icon = icons[icon];
  const dimensions = size === "lg" ? "size-24" : size === "sm" ? "size-8" : "size-10";
  const iconSize = size === "lg" ? 35 : size === "sm" ? 15 : 19;
  return (
    <span className={`inline-grid ${dimensions} shrink-0 place-items-center rounded-full border ${colors[color]}`} role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      <Icon size={iconSize} aria-hidden="true" strokeWidth={1.8} />
    </span>
  );
}
