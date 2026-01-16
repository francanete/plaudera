import type { Metadata } from "next";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: {
    template: `%s | ${appConfig.name} Feedback`,
    default: `Feedback Board | ${appConfig.name}`,
  },
  description: "Share your ideas and vote on feature requests",
};

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <main className="container mx-auto max-w-3xl px-4 py-8">{children}</main>
      <footer className="border-t py-6">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <p className="text-muted-foreground text-sm">
            Powered by{" "}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL}
              className="hover:text-foreground font-medium underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {appConfig.name}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
