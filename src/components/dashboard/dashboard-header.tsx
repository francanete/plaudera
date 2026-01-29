interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome back, {userName}!
      </h1>
      <p className="text-muted-foreground mt-1">
        Here&apos;s what&apos;s happening with your account.
      </p>
    </div>
  );
}
