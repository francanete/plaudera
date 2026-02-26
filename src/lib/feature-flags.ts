export function hasFeatureFlag(
  featureFlags: Record<string, boolean> | null,
  flag: string
): boolean {
  return featureFlags?.[flag] === true;
}
