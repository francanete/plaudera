import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, subscriptions } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { BillingSection } from "@/components/settings/billing-section";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session!.user.id))
    .limit(1);

  const user = session!.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Account"
        subtitle="Manage your account and billing."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList id="tour-settings-tabs">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card id="tour-settings-profile">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your personal information and profile settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={user.image || undefined}
                    alt={user.name || "User"}
                  />
                  <AvatarFallback className="text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.name || "No name set"}</p>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <label className="text-muted-foreground text-sm font-medium">
                    Email
                  </label>
                  <p className="mt-1">{user.email}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Email cannot be changed directly.
                  </p>
                </div>
              </div>

              <Separator />

              <ProfileForm defaultValues={{ name: user.name || "" }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div id="tour-settings-billing">
            <BillingSection subscription={subscription} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
