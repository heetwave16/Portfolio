"use client";

import { useSyncExternalStore } from "react";
import {
  ALL_MOTION_ENABLED,
  parseMotionBisectFlags,
  type MotionDisabledFlags,
} from "@/src/lib/motion";

let cachedSearch = "";
let cachedFlags: MotionDisabledFlags = ALL_MOTION_ENABLED;

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getSnapshot(): MotionDisabledFlags {
  const search = window.location.search;
  if (search !== cachedSearch) {
    cachedSearch = search;
    cachedFlags = parseMotionBisectFlags(search);
  }
  return cachedFlags;
}

function getServerSnapshot(): MotionDisabledFlags {
  return ALL_MOTION_ENABLED;
}

export function useMotionBisect(): MotionDisabledFlags {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
