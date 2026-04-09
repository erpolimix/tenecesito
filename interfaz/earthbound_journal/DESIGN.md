# Design System Strategy: The Curated Chronicle

This design system is crafted to transform a digital support platform into a tactile, editorial experience. Moving away from the cold efficiency of traditional social apps, we embrace the "Shared Journal" aesthetic—a space that feels whispered rather than shouted, where negative space is as vital as the content itself.

## 1. Creative North Star: The Sentimental Archive
The "Creative North Star" for this system is **The Sentimental Archive**. 

We treat every interaction as a page in a high-end, bespoke publication. This is achieved through intentional asymmetry—placing elements off-center to mimic the hand-placed nature of a scrapbook—and overlapping surfaces that suggest the depth of physical paper. We break the rigid digital grid by utilizing generous margins and "floating" typography that commands attention without being aggressive.

## 2. Color & Surface Strategy
Our palette is rooted in the organic. We avoid the artificiality of pure #000000 or #FFFFFF, opting instead for deep charcoals and warm creams that reduce ocular fatigue and invite long-form reading.

### The "No-Line" Rule
To achieve a premium, seamless feel, **1px solid borders are strictly prohibited** for sectioning. Boundaries must be defined through:
*   **Background Shifts:** Distinguish content by moving from `surface` to `surface-container-low`.
*   **Tonal Transitions:** Use soft, organic dividers or color-blocking to separate major content areas.

### Surface Hierarchy & Nesting
Treat the interface as a series of stacked, fine papers. 
*   **Base:** `surface` (#faf9f7) for the main canvas.
*   **Depth 1:** `surface-container-low` (#f5f3f1) for secondary groupings.
*   **Depth 2:** `surface-container-highest` (#e3e2e0) for interactive elements like cards or inputs.
*   **Depth 3:** `surface-bright` (#faf9f7) for high-importance modals.

### Signature Textures
Utilize the **"Glass & Gradient" Rule**. For primary CTAs and hero sections, use subtle linear gradients transitioning from `primary` (#91462e) to `primary-container` (#af5e44). For floating navigation or overlays, apply **Glassmorphism**: use `surface-container-low` at 80% opacity with a `24px` backdrop blur to allow the organic tones beneath to bleed through softly.

## 3. Typography: Editorial Authority
Spanish text requires breathing room. We implement a **1.6x line-height** across all body styles to ensure legibility and a relaxed reading pace.

*   **Display & Headlines (The Serif):** Using *Newsreader*. This variable serif provides an authoritative, editorial voice. It should be used with tight letter-spacing (-0.02em) in Display sizes to feel like a printed masthead.
*   **Body & Labels (The Sans):** Using *Plus Jakarta Sans*. A modern, friendly sans-serif that remains legible even at `body-sm` sizes. It balances the "old-world" feel of the serif with modern accessibility.
*   **The Hierarchy:**
    *   **Display-lg (3.5rem):** Reserved for hero emotional states.
    *   **Headline-md (1.75rem):** For journal section titles.
    *   **Body-lg (1rem):** Default for user-generated journal entries.

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often a crutch for poor layout. In this system, we prioritize **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background to create a soft, natural "lift."
*   **Ambient Shadows:** Where floating is required (e.g., FABs or Modals), use extra-diffused shadows. 
    *   *Shadow Token:* `box-shadow: 0 12px 40px rgba(27, 28, 27, 0.06);` (a 6% tint of our `on-surface` color).
*   **The "Ghost Border" Fallback:** If a container requires definition against an identical background, use the `outline-variant` (#dac1ba) at **15% opacity**.

## 5. Components

### Buttons & Chips
*   **Primary Button:** `primary` (#91462e) background with `on-primary` (#ffffff) text. Shape: `xl` (3rem) rounding for a pill-like, welcoming feel.
*   **Selection Chips:** Use `secondary-container` (#d5e3d7) with a `sm` (0.5rem) corner radius. For selected states, transition to `secondary` (#546258).

### Cards & Feed Items
*   **Standard Card:** Use `surface-container-low` with `md` (1.5rem) rounding. 
*   **Rule:** **No Dividers.** Separate card header, body, and footer using vertical whitespace (e.g., 24px or 32px gaps) rather than horizontal lines.

### Input Fields
*   **Styling:** Use a `surface-variant` (#e3e2e0) background with a "Ghost Border" that becomes `primary` only on focus.
*   **Feedback:** `error` (#ba1a1a) for invalid inputs, but always paired with `error-container` (#ffdad6) backgrounds for the entire input block to ensure the user feels "held" rather than "scolded."

### Specialized Component: The "Reflection Bar"
A horizontal scroll of wide, `lg` (2rem) rounded tiles using `tertiary-container` (#76756f), used for daily prompts or shared moods.

## 6. Do's and Don'ts

| Do | Don't |
| :--- | :--- |
| **Do:** Use `surface-container` tiers to create hierarchy. | **Don't:** Use 1px black or grey borders to separate content. |
| **Do:** Use 1.6x line heights for all Spanish body copy. | **Don't:** Tighten leading to save vertical space; let the page breathe. |
| **Do:** Apply `xl` (3rem) corner radius to large containers. | **Don't:** Mix sharp corners with rounded ones; keep the "soft" ethos. |
| **Do:** Use `newsreader` for emotional or editorial headlines. | **Don't:** Use Serif for long-form body text; it fatigues the eye digitally. |
| **Do:** Use tinted shadows (6% opacity of charcoal). | **Don't:** Use high-opacity, neutral grey drop shadows. |
| **Do:** Embrace asymmetrical layouts and overlapping elements. | **Don't:** Force every element into a perfectly centered, flat grid. |

## 7. Status & States
*   **Success:** Gentle Green (`on-secondary-container`) — Growth and resolution.
*   **Blocked:** Soft Gray (`tertiary-fixed-dim`) — Stagnation or pause.
*   **Warning:** Muted Amber (Custom #D9A74A) — Caution and reflection.
*   **Closed:** Faded Indigo (Custom #5C627D) — Finality and archive status.