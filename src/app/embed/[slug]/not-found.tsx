import Link from "next/link";
import { appConfig } from "@/lib/config";

export default function EmbedNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <h1 className="text-xl font-semibold">Board Not Found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This feedback board doesn&apos;t exist or has been removed.
      </p>
      <Link
        href={appConfig.seo.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary mt-4 text-sm hover:underline"
      >
        Learn more about {appConfig.name}
      </Link>
    </div>
  );
}
