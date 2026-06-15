"use client";

import { startTransition, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";

export function useApiQuery<T>({
  endpoint,
  requireAuth = true,
  initialData,
}: {
  endpoint: string;
  requireAuth?: boolean;
  initialData: T;
}) {
  const { session, status } = useAuth();
  const token = session?.token ?? null;
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const refresh = () => {
    startTransition(() => {
      setRequestVersion((value) => value + 1);
    });
  };

  useEffect(() => {
    if (requireAuth && (!token || status !== "authenticated")) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextData = await apiRequest<T>(endpoint, {
          token: requireAuth ? token : undefined,
        });

        if (!cancelled) {
          setData(nextData);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(toErrorMessage(nextError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpoint, requireAuth, requestVersion, status, token]);

  return { data, error, isLoading, refresh };
}
