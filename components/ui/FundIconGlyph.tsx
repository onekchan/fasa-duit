import {
  PiggyBank,
  Moon,
  Car,
  Laptop,
  Baby,
  Shield,
  GraduationCap,
  Heart,
  Plane,
  Home,
  type LucideIcon,
} from "lucide-react";
import type { FundIconName } from "@/lib/funds";

const MAP: Record<FundIconName, LucideIcon> = {
  piggy: PiggyBank,
  moon: Moon,
  car: Car,
  laptop: Laptop,
  baby: Baby,
  shield: Shield,
  cap: GraduationCap,
  heart: Heart,
  plane: Plane,
  home: Home,
};

/** Render a fund icon by short name. Falls back to piggy. */
export function FundIconGlyph({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = MAP[(name as FundIconName) in MAP ? (name as FundIconName) : "piggy"];
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden="true" />;
}
