function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.replace(/\/+$/, "");
}

/** Public base URL this app is reachable at (e.g. https://track.ddn.com). */
export function appBaseUrl(): string {
  return requireEnv("APP_BASE_URL");
}

export function trackingPixelUrl(token: string): string {
  return `${appBaseUrl()}/api/sc26-outreach/track/open/${token}`;
}

export function trackingClickUrl(token: string): string {
  return `${appBaseUrl()}/api/sc26-outreach/track/click/${token}`;
}

export function graphWebhookUrl(): string {
  return `${appBaseUrl()}/api/sc26-outreach/graph/webhook`;
}

export function bookingDestinationUrl(): string {
  return process.env.SC26_BOOKING_URL || "https://www.ddn.com/lp/events/sc2026/book-a-meeting/";
}
