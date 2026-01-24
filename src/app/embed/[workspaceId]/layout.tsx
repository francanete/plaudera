import { appConfig } from "@/lib/config";

export const metadata = {
  title: "Feedback Widget",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <main className="flex-1 overflow-auto p-4">{children}</main>
      <footer className="border-t py-3 text-center">
        <a
          href={appConfig.seo.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Powered by {appConfig.name}
        </a>
      </footer>
    </div>
  );
}
