'use client'

import { motion, type Variants } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'

// Standard entrance animation variants
export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: 'easeOut' }
    }
}

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.25, ease: 'easeOut' }
    }
}

// Stagger children container
export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
}

// Stagger item for lists
export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: 'easeOut' }
    }
}

// Hook to get reduced motion safe variants
export function useMotionVariants<T extends Variants>(variants: T): T | undefined {
    const shouldReduceMotion = useReducedMotion()
    return shouldReduceMotion ? undefined : variants
}

// Export motion for convenience
export { motion, useReducedMotion }
