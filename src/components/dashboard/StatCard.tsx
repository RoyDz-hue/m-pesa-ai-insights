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
    success: "text-status-success",
    warning: "text-status-warning",
    danger: "text-status-error",
  };

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "mt-2 flex items-center text-sm",
                trend.isPositive ? "text-status-success" : "text-status-error"
              )}
            >
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
              <span className="ml-1 text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            variant === "default" && "bg-primary/10",
            variant === "success" && "bg-status-success/10",
            variant === "warning" && "bg-status-warning/10",
            variant === "danger" && "bg-status-error/10"
          )}
        >
          <Icon className={cn("h-6 w-6", variantStyles[variant])} />
        </div>
      </div>
    </div>
  );
}
