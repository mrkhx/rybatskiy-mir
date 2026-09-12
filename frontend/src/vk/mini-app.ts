/**
 * Lightweight VK Mini App environment detection.
 * The official VK Bridge SDK will be wired later; do not assume launch params are trusted.
 */
export function isVkMiniApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.has("vk_user_id") || params.has("vk_app_id");
}

export function readVkUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("vk_user_id");
}
