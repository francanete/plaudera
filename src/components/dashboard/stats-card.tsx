import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  variant?: "default" | "warning";
  href?: string | null;
  tourId?: string;
}

export function StatsCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "default",
  href,
  tourId,
}: StatsCardProps) {
  const isWarning = variant === "warning";

  const cardClasses = isWarning
    ? "cursor-pointer border-orange-200 bg-orange-50/30 transition-all hover:border-orange-300 hover:shadow-md dark:border-orange-800 dark:bg-orange-950/20 dark:hover:border-orange-700"
    : "transition-all hover:shadow-md";

  const textClasses = isWarning
    ? "text-orange-600 dark:text-orange-400"
    : "text-muted-foreground";

  const valueClasses = isWarning ? "text-orange-600 dark:text-orange-400" : "";

  const subtextClasses = isWarning
    ? "text-orange-600/80 dark:text-orange-400/80"
    : "text-muted-foreground";

  const cardContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`text-sm font-medium ${textClasses}`}>
          {label}
        </CardTitle>
        <Icon className={`h-4 w-4 ${textClasses}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClasses}`}>{value}</div>
        <p className={`text-xs ${subtextClasses}`}>{subtext}</p>
      </CardContent>
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <Card
          id={tourId ? `tour-${tourId}` : undefined}
          className={cardClasses}
        >
          {cardContent}
        </Card>
      </Link>
    );
  }

  return (
    <Card id={tourId ? `tour-${tourId}` : undefined} className={cardClasses}>
      {cardContent}
    </Card>
  );
}
