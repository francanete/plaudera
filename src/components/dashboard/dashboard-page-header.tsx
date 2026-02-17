import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const headerActionClassName =
  "bg-foreground text-background hover:bg-foreground/90 gap-2";

interface ActionConfig {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  action?: React.ReactNode | ActionConfig;
  backHref?: string;
  backLabel?: string;
}

function isActionConfig(
  action: React.ReactNode | ActionConfig
): action is ActionConfig {
  return (
    action !== null &&
    typeof action === "object" &&
    "label" in action &&
    "href" in action
  );
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
  const renderedAction = action ? (
    isActionConfig(action) ? (
      <Button asChild className={headerActionClassName}>
        <Link
          href={action.href}
          {...(action.external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Link>
      </Button>
    ) : (
      action
    )
  ) : null;

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

        {renderedAction && (
          <div className="w-full shrink-0 sm:w-auto">{renderedAction}</div>
        )}
      </div>
    </header>
  );
}
