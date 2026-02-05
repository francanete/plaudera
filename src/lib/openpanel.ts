import { OpenPanel } from "@openpanel/nextjs";

let opInstance: OpenPanel | null = null;

export function getOpenPanelClient(): OpenPanel {
  if (!opInstance) {
    if (typeof window !== "undefined") {
      throw new Error(
        "OpenPanel server client should only be used on the server side"
      );
    }

    if (!process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID) {
      throw new Error(
        "NEXT_PUBLIC_OPENPANEL_CLIENT_ID environment variable is required"
      );
    }

    if (!process.env.OPENPANEL_CLIENT_SECRET) {
      throw new Error(
        "OPENPANEL_CLIENT_SECRET environment variable is required"
      );
    }

    opInstance = new OpenPanel({
      clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID,
      clientSecret: process.env.OPENPANEL_CLIENT_SECRET,
    });
  }

  return opInstance;
}
