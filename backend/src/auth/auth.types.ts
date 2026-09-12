export type AuthUser = {
  id: string;
  vkId: string;
  nickname: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};
