"use client";

import { useEffect, useState } from "react";
import type { RenderCapabilities } from "@/types/encoder";
import { defaultCapabilities, detectCapabilities } from "@/lib/utils/capabilities";

export function useCompatibility(): {
  capabilities: RenderCapabilities;
  detected: boolean;
} {
  const [capabilities, setCapabilities] = useState<RenderCapabilities>(defaultCapabilities);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void detectCapabilities().then((caps) => {
      if (!cancelled) {
        setCapabilities(caps);
        setDetected(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { capabilities, detected };
}