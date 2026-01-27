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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <main className="container mx-auto max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Powered by{" "}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL || "/"}
              className="font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
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
