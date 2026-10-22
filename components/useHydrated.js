'use client';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
/** false during server render and before hydration; true once React controls the page. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
