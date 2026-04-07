import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  xs: "w-1.5 h-1.5 border",
  sm: "w-2 h-2 border-[1.5px]",
  md: "w-2.5 h-2.5 border-2",
  lg: "w-3 h-3 border-2",
};

export function OnlineDot({
  isOnline,
  size = "md",
  className,
}: {
  isOnline?: boolean;
  size?: Size;
  className?: string;
}) {
  if (!isOnline) return null;
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 rounded-full bg-green-500 border-background",
        SIZE_CLASSES[size],
        className
      )}
    />
  );
}
