import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "text-primary",
    success: "text-[hsl(var(--status-success))]",
    warning: "text-[hsl(var(--status-warning))]",
    danger: "text-[hsl(var(--status-error))]",
  };

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 md:mt-2 text-lg md:text-2xl lg:text-3xl font-bold text-foreground truncate">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "mt-1 md:mt-2 flex items-center text-xs md:text-sm",
                trend.isPositive ? "text-[hsl(var(--status-success))]" : "text-[hsl(var(--status-error))]"
              )}
            >
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "h-9 w-9 md:h-12 md:w-12 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0",
            variant === "default" && "bg-primary/10",
            variant === "success" && "bg-[hsl(var(--status-success)/0.1)]",
            variant === "warning" && "bg-[hsl(var(--status-warning)/0.1)]",
            variant === "danger" && "bg-[hsl(var(--status-error)/0.1)]"
          )}
        >
          <Icon className={cn("h-4 w-4 md:h-6 md:w-6", variantStyles[variant])} />
        </div>
      </div>
    </div>
  );
}
