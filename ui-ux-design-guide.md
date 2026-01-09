# UI/UX Design Guide (Grid Systems + Modern Web Principles)

This document guides how we design UI in this repo so screens feel **intentional, readable, and consistent**. It is inspired by Josef Müller‑Brockmann’s grid philosophy (structure, rhythm, hierarchy) and practical web UX principles (clarity, accessibility, restraint).

Use this as the agent’s default design standard unless the user explicitly requests a different style.

## Non-negotiables (defaults)

- **Use structure**: every page uses a grid (even if it’s subtle).
- **Use a spacing system**: never “random” padding/margins.
- **Prefer clarity over cleverness**: copy, hierarchy, and flows should be instantly scannable.
- **Consistency beats novelty**: reuse patterns and components.
- **Accessibility is part of design**: keyboard/focus/contrast are not optional.
- **Motion is functional**: animation communicates state, not decoration.

## Grid system (layout)

### Choose a grid per surface

- **App screens (dashboards, tools)**: typically **12-column grid** with consistent gutters.
- **Marketing / landing pages**: often **12-column** or **CSS grid with named areas**, but still aligned to a consistent rhythm.
- **Dense data**: allow tighter columns, but keep baseline spacing consistent.

### Container + alignment rules

- **Use a centered container** for primary content regions.
- **Align edges**: headers, cards, tables, and section titles should snap to the same vertical lines.
- **Prefer fewer alignment lines**: too many competing edges creates visual noise.

### Recommended baseline + spacing units

- **Base unit**: 4px (for fine adjustments)
- **Primary rhythm**: 8px (most paddings/margins)
- **Section spacing**: 24–64px (depending on density)

Rule: **Spacing must be a multiple of 4px**, and in practice should mostly be 8/16/24/32/48/64.

### Gutters and columns (guideline)

- **Gutter**: 16–24px on mobile; 24–32px on desktop.
- **Outer margins**: at least 16px mobile; 24–40px desktop.
- **Avoid edge-to-edge text blocks**: keep readable measure (see Typography).

## Whitespace (margins, padding, density)

Whitespace is not “empty”; it’s structure.

### Component spacing rules

- **Cards**:
  - Padding: 16–24px
  - Internal gaps between elements: 8–16px
- **Forms**:
  - Vertical spacing between fields: 12–16px
  - Group related fields with a label + helper + consistent gap
- **Tables / lists**:
  - Row height: comfortable by default; increase for touch targets
  - Use subtle separators; avoid heavy gridlines unless necessary

### Density ladder (pick one per page)

- **Comfortable**: onboarding, settings, content reading
- **Standard**: most app screens
- **Compact**: dense admin/data views (only when needed)

Rule: Do not mix density wildly within the same page.

## Visual hierarchy (what should the eye see first?)

- **1 primary action per view** (or per card/section). Everything else is secondary.
- Use **size, weight, position, and whitespace** before color.
- **Section headers** should:
  - clearly label the content below
  - sit on a consistent vertical rhythm
  - optionally include a small action area aligned right
- Prefer **progressive disclosure** over showing everything at once.

## Typography (readability + rhythm)

### Readable measure

- Long-form text: aim for ~\(45\)–\(80\) characters per line.
- UI labels: shorter is better; do not wrap if it harms scanning.

### Type scale (guideline)

Use a small, consistent scale (avoid too many font sizes):

- **Page title**
- **Section title**
- **Body**
- **Small / helper**

Rule: do not invent new font sizes to “make it look right”; fix hierarchy/spacing first.

### Line height and scanning

- Body text: generous line height for readability.
- Dense data: slightly tighter, but never cramped.
- Prefer left alignment for body text; avoid justified text on the web.

## Copywriting (microcopy that converts and clarifies)

### Principles

- **Use simple words**. Avoid jargon unless the user asked for it.
- **Be specific**: “Save changes” > “Submit”.
- **Be short**: remove filler.
- **One idea per sentence**.
- **Front-load meaning**: first 3–5 words should signal intent.

### UI copy rules

- Buttons:
  - Use verb + object (“Create invoice”, “Add member”, “Generate summary”).
  - Avoid vague labels (“OK”, “Yes”) unless in confirmations.
- Empty states:
  - Explain what this area is + how to fill it.
  - Provide one primary action.
- Errors:
  - Say what happened, why (if known), and what to do next.
  - Avoid blame-y language.
- Helper text:
  - Prefer concise constraints (“Max 50 characters.”).

### Tone

- Professional, calm, and direct.
- Avoid overly playful copy unless the brand explicitly wants it.

## Components (implementation constraints)

- **Default to shadcn components** from `components/ui`.
- Compose primitives into higher-level components rather than rebuilding from scratch.
- Keep component variants minimal and purposeful (avoid variant explosion).
- Prefer consistent patterns:
  - cards for grouped info
  - tabs for peer views
  - accordions for progressive disclosure
  - dialogs for focused tasks (keep them short)

## Color and contrast (accessibility-first)

- Color should convey **meaning**, not decoration.
- Never rely on color alone for status; use icon/label/text too.
- Ensure interactive states are clear:
  - hover, focus, active, disabled
- Respect contrast:
  - body text must remain readable on all backgrounds

### Design tokens (global variables only)

- **Always use global variables for colors** so we can change the theme/design system quickly.
  - Define color tokens as **CSS variables** (e.g., in `app/globals.css`) using `:root` and `.dark`.
  - Use those tokens everywhere (via Tailwind/shadcn token classes), not raw hex/RGB values.
- **Avoid hardcoded colors in components**:
  - Don’t introduce ad-hoc `#XXXXXX` values in UI code unless the user explicitly requests it.
  - Prefer semantic tokens (background, foreground, primary, muted, destructive, etc.) over “brandBlue500”.

### 60 / 30 / 10 color rule (default)

Use the **60/30/10 rule** to keep the UI clean and consistent:

- **60% base**: neutral canvas (backgrounds + the majority of surfaces)
- **30% support**: secondary surfaces that create structure and grouping (cards, panels, sidebar, separators)
- **10% accent**: emphasis color for primary actions, selected states, and key highlights

#### How this maps to shadcn tokens

- **60% (base)**:
  - `background`, `foreground`
- **30% (support)**:
  - `card`, `muted`, `secondary`, `border`, `input`, `sidebar*`
- **10% (accent/emphasis)**:
  - `primary` (and limited use of `accent`, `ring`)

#### Accent choice (Flighty-inspired)

- **Accent / primary**: `#F6BD02` (inspired by the accent used on [Flighty](https://flighty.com/))

#### Constraints (avoid “yellow everywhere”)

- Do **not** use the accent as a large background surface.
- Use accent primarily for:
  - primary CTA buttons
  - selected nav items / active states
  - focus ring emphasis (sparingly)
  - one highlight series in charts (others should be neutral/support palette)

#### Accessibility note for a yellow primary

- Keep `primary-foreground` **near-black** so text on yellow remains readable in both light and dark themes.
  - If a dark theme uses a lighter primary surface, still ensure foreground contrast is maintained.

## Forms (UX rules)

- Labels are always visible (avoid placeholder-only labels).
- Show validation:
  - **on submit** for most fields
  - **on blur** for immediate constraints (email format, min length) if helpful
- Group related fields and use clear section titles.
- Make the primary action obvious; secondary actions should be less prominent.

## Motion & animation (Lenis + Framer Motion)

Motion should communicate:

- **Spatial/structural change** (a panel opened)
- **State** (loading → success)
- **Continuity** (something moved, not teleported)

### Global motion rules

- Keep transitions short:
  - micro interactions: ~150–250ms
  - section transitions: ~250–400ms
- Use easing that feels natural (avoid linear).
- Avoid animating layout in a way that causes disorientation.
- Respect reduced motion preferences:
  - if `prefers-reduced-motion`, reduce or disable non-essential animations

### Smooth scrolling (Lenis)

- Use Lenis only if it improves the experience; don’t add it “just because”.
- Avoid breaking native expectations:
  - keep anchor links, focus jumps, and keyboard navigation working
- If smooth scroll is enabled, test:
  - trackpad/mouse wheel
  - keyboard (space/page up/down)
  - focus to element on navigation

### UI transitions (Framer Motion)

- Use Framer Motion for:
  - entering/leaving content blocks
  - expanding/collapsing panels
  - subtle emphasis on state change
- Prefer subtle transforms + opacity over large motion.
- Use consistent patterns:
  - **fade + small y-translate** for entering content
  - **height/clip** for accordion-like reveals (careful with layout shift)

#### Example patterns (keep consistent)

```ts
// Pattern: subtle entrance
// opacity: 0 → 1, y: 6 → 0, duration ~0.25–0.35s
```

```ts
// Pattern: reduced motion handling
// if prefers-reduced-motion: disable y transforms and shorten duration
```

## Loading, empty, and error states (required)

Design is incomplete without these states.

- **Loading**:
  - use skeletons for structured content
  - keep layout stable to avoid jank
- **Empty**:
  - explain what this is
  - show one primary “next step” action
- **Error**:
  - show recovery (retry) when possible
  - avoid dead ends

## Navigation + information architecture

- Keep nav labels short and task-oriented.
- Group features by user mental model, not internal implementation.
- Breadcrumbs are useful in deep hierarchies, but don’t add them everywhere.
- Always show where the user is (active state + page title).

## Accessibility checklist (ship-ready minimum)

- Keyboard navigation works end-to-end
- Visible focus states for all interactive elements
- Sufficient contrast for text and controls
- Inputs have labels and helpful error messages
- Touch targets are large enough
- Reduced motion is respected

## Design review checklist (quick pass)

- Grid alignment: are major edges aligned?
- Spacing: are margins/paddings on a consistent system?
- Hierarchy: is the primary action obvious within 3 seconds?
- Copy: any sentence that can be cut or simplified?
- States: loading/empty/error accounted for?
- Motion: subtle, consistent, and respects reduced motion?


