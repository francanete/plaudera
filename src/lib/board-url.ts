/**
 * Get the public board URL for a workspace slug.
 * Returns the subdomain URL (e.g. https://acme.plaudera.com).
 * Throws if NEXT_PUBLIC_APP_URL is not set.
 *
 * This is in its own file (separate from workspace.ts) so that client
 * components can import it without pulling in server-only dependencies
 * like the database driver.
 */
export function getBoardUrl(slug: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is required for subdomain URLs");
  }
  const url = new URL(appUrl);
  return `${url.protocol}//${slug}.${url.host}`;
}
