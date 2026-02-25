import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "",
  plugins: [twoFactorClient()],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
