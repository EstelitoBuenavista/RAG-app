'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tracks a CSS media query from JS.
 *
 * Used where a breakpoint has to change *which component renders*, not just how
 * it looks — a portalled overlay and an inline panel can't be swapped with CSS
 * alone.
 *
 * `matchMedia` is an external store, so it's read through
 * `useSyncExternalStore` rather than effect-plus-setState: that keeps the value
 * consistent with what React renders and avoids a tearing/extra-render pass.
 * The server snapshot is `false`, so render the narrow-screen variant as the
 * default.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const list = window.matchMedia(query)
            list.addEventListener('change', onStoreChange)
            return () => list.removeEventListener('change', onStoreChange)
        },
        [query]
    )

    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(query).matches,
        () => false
    )
}
