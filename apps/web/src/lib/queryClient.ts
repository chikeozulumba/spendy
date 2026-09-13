import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * A single global error handler for every query and mutation in the app,
 * rather than each call site wiring its own toast. Queries key their toast
 * by `query.queryHash` so a polling query that keeps failing (e.g. a
 * processing statement's 3s refetch) updates one toast in place instead of
 * stacking a new one on every retry.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(errorMessage(error), { id: query.queryHash });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  }),
});
