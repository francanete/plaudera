"use client";

import { IdentifyComponent } from "@openpanel/nextjs";
import { useSession } from "@/lib/auth-client";

export function IdentifyUser() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <IdentifyComponent
      profileId={session.user.id}
      email={session.user.email || undefined}
      firstName={session.user.name?.split(" ")[0]}
      lastName={session.user.name?.split(" ").slice(1).join(" ") || undefined}
    />
  );
}
