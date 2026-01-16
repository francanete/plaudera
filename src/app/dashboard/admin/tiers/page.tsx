import { getTierConfigs } from "@/actions/admin";
import { RateLimitsEditor } from "@/components/admin/rate-limits-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TiersPage() {
  const result = await getTierConfigs();

  if (!result.success) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { tiers, limits } = result;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tier Management</h1>
        <p className="text-muted-foreground">
          Configure subscription tiers and their rate limits
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Tiers</CardTitle>
          <CardDescription>
            These tiers are configured in your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {tiers.map((tier) => (
              <div key={tier.plan} className="min-w-50 rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-semibold">{tier.displayName}</span>
                  {!tier.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {tier.description || "No description"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>
            Configure how many requests each tier can make per feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RateLimitsEditor tiers={tiers} limits={limits} />
        </CardContent>
      </Card>
    </div>
  );
}
