import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Map } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { RoadmapIdeaForm } from "./roadmap-idea-form";

export default async function CreateRoadmapIdeaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Add Roadmap Idea"
        subtitle="Create an idea directly on your public roadmap."
        icon={Map}
        iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        backHref="/dashboard/roadmap"
        backLabel="Roadmap"
      />

      <RoadmapIdeaForm />
    </div>
  );
}
