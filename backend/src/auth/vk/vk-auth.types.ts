export type VkIdentity = {
  vkId: string;
  nickname: string;
};

export type VkLaunchParams = Record<string, string | undefined>;

export const VK_AUTH_PROVIDER = "VK_AUTH_PROVIDER";

export interface VkAuthProvider {
  isConfigured(): boolean;
  verifyLaunchParams(params: VkLaunchParams): Promise<VkIdentity>;
}
