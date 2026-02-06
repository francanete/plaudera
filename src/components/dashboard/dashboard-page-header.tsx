import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function DashboardPageHeader({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  action,
  backHref,
  backLabel = "Back",
}: DashboardPageHeaderProps) {
  return (
    <header>
      {backHref && (
        <Link
          href={backHref}
          className="group text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`rounded-lg p-2 ${iconClassName ?? ""}`}>
                <Icon className="h-6 w-6" />
              </div>
            )}
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-muted-foreground mt-1 text-base">{subtitle}</p>
          )}
        </div>

        {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
      </div>
    </header>
  );
}
