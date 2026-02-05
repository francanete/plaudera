"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpenPanelComponent } from "@openpanel/nextjs";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OpenPanelComponent
        clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!}
        apiUrl="https://api.analytics.francanete.dev"
        trackScreenViews
        trackOutgoingLinks
        trackAttributes
      />
      {children}
    </QueryClientProvider>
  );
}
