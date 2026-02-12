"use client";

import { useCallback, useEffect, useState } from "react";

type CreditsState = {
  creditsRemaining: number;
  creditsTotal: number;
  creditsUsed: number;
  canGenerate: boolean;
  tier: "free" | "basic" | "pro" | "enterprise";
  status: "active" | "past_due" | "trialing" | "canceled";
  isLoading: boolean;
  error: string | null;
};

type CreditsResponse = {
  data: {
    creditsRemaining: number;
    creditsTotal: number;
    creditsUsed: number;
    canGenerate: boolean;
    tier: "free" | "basic" | "pro" | "enterprise";
    status: "active" | "past_due" | "trialing" | "canceled";
  };
};

const DEFAULT_STATE: CreditsState = {
  creditsRemaining: 0,
  creditsTotal: 0,
  creditsUsed: 0,
  canGenerate: false,
  tier: "free",
  status: "active",
  isLoading: true,
  error: null,
};

export function useCredits() {
  const [state, setState] = useState<CreditsState>(DEFAULT_STATE);

  const fetchCredits = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/user/credits");
      if (!response.ok) throw new Error("Failed to fetch credits");
      const json = (await response.json()) as CreditsResponse;
      setState({
        ...json.data,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load credits",
      }));
    }
  }, []);

  useEffect(() => {
    void fetchCredits();
  }, [fetchCredits]);

  return { ...state, refresh: fetchCredits };
}
