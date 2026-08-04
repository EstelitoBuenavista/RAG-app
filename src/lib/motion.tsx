'use client'

/**
 * Motion re-exports.
 *
 * Components pass explicit `initial`/`animate` objects and gate them on
 * `useReducedMotion()` themselves. The previous `useMotionVariants` helper
 * returned `undefined` under reduced motion, which left elements referencing
 * variant names that no longer existed — the cause of the invisible document
 * rows fixed in 961f444. Explicit props make that failure mode impossible.
 */
export { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
export type { Variants } from 'framer-motion'
