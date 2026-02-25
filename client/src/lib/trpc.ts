import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";

// O tipo AppRouter é importado do server apenas em dev para type-safety
// Em runtime, o tRPC resolve tudo via HTTP
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>();

export function getTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
