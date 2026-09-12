import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { VkAuthProvider, VkIdentity, VkLaunchParams } from "./vk-auth.types";

/**
 * Production VK Mini Apps / VK ID verification is not enabled yet.
 * Plug a real implementation here after VK_APP_ID and VK_APP_SECRET are configured.
 *
 * TODO(vk-auth): HMAC-verify `vk_*` launch params and map vk_user_id -> User.
 */
@Injectable()
export class UnconfiguredVkAuthProvider implements VkAuthProvider {
  isConfigured(): boolean {
    return false;
  }

  verifyLaunchParams(_params: VkLaunchParams): Promise<VkIdentity> {
    throw new ServiceUnavailableException(
      "VK authorization is not configured. See docs/vk-auth.md",
    );
  }
}
