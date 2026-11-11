# Odemes — Mobile Responsive Spec

**Goal:** Make the existing app fully usable on phones **without redesigning it.** Keep the current visual identity (dark warm palette, serif display headings, mono numerals, orange accent, green/red coding). This is a *responsive layout pass* — the desktop layout already works; we're adding mobile reflow + a bottom tab bar.

**Stack:** React / Next.js. CSS is written framework-agnostically below; Tailwind equivalents noted inline where useful. Adapt to your styling system (CSS Modules / Tailwind / styled-components).

**Primary problem being solved:** navigation is hard on mobile because the desktop left sidebar has nowhere to go.

---

## 0. Conventions used in this doc

- `--mobile` = viewport `< 768px`. Everything below targets this breakpoint unless stated.
- "Thumb zone" = bottom ~third of the screen, where a one-handed user's thumb reaches comfortably.
- Tap target minimum = **44×44px** (48px preferred).
- Checkboxes are acceptance items — tick when done and verified on a real phone, not just devtools.

---

## 1. Global setup

- [ ] **Confirm the breakpoint.** Standardize on `768px` as the mobile/desktop cutoff. Define it once (CSS var, Tailwind config, or theme token) — don't scatter magic numbers.
- [ ] **Adopt mobile-first.** Base styles target mobile; layer desktop on top with `@media (min-width: 768px)`. Do *not* write desktop-first with `max-width` overrides — it's harder to maintain and a frequent source of mobile bugs.
- [ ] **Use `100dvh`, not `100vh`,** for any full-height containers. `vh` is wrong on mobile browsers because of the dynamic URL bar; `dvh` accounts for it.
- [ ] **Respect safe areas.** The viewport meta already has `viewport-fit=cover` (good). Add bottom padding for the home-indicator on notched phones:
  ```css
  padding-bottom: env(safe-area-inset-bottom);
  ```
  Apply to the bottom tab bar and any bottom sheet.
- [ ] **Verify the viewport meta is untouched.** It already reads `width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover`. Keep `maximum-scale=5` (do NOT set it to 1 — disabling zoom is an accessibility failure).

---

## 2. Navigation — the core change

Replace the desktop left sidebar (on mobile only) with a **fixed bottom tab bar**. Keep the sidebar exactly as-is for `≥768px`.

### 2.1 Bottom tab bar component

- [ ] Create a `<BottomNav>` component rendered **only on mobile** (`hidden md:hidden` won't do it — render conditionally or with a `block md:hidden` wrapper).
- [ ] **4 tabs + 1 center action**, in this order:
  `Home · Activity(Transactions) · [ + ] · Recurring · Report`
- [ ] Do **not** put 5 tabs *and* a FAB — too many narrow targets. Profile/Settings moves to the header avatar (top-right) and/or a row inside Settings.
- [ ] Each tab = **icon + short label** (label stays visible; don't hide labels). Inactive = muted gray, active = orange accent.
- [ ] Tab bar specs:
  - `position: fixed; bottom: 0; left: 0; right: 0;`
  - height `64px` + `env(safe-area-inset-bottom)` padding
  - background matches the current nav surface (`#1b1916`-ish), top border `1px solid rgba(255,255,255,0.07)`
  - `z-index` above page content, below modals/sheets
- [ ] **Center "+" button (FAB):** raised circle, orange, `~54px`, vertically overlapping the bar's top edge (`margin-top: -22px`). Opens the quick-add sheet (§4). `aria-label="Add transaction"`.
- [ ] **Active state is driven by the router**, not local state. In Next.js use `usePathname()` (App Router) or `router.pathname` (Pages Router) to mark the current tab — so deep links and refreshes show the correct active tab.
- [ ] Each tab is a real `<Link>` (anchor), not a div with onClick — preserves prefetch, middle-click, and accessibility.

### 2.2 Page content offset

- [ ] Add `padding-bottom` to the scrollable page region equal to the tab bar height + safe area, so the last list item isn't hidden under the bar.
- [ ] Remove/hide the desktop sidebar's width offset on mobile (the main content should be full-width under 768px).

### 2.3 Header on mobile

- [ ] Show the `odemes` wordmark (left) and the user avatar (right) in a slim top bar. Avatar tap → Settings/Profile. This replaces the sidebar profile card as the entry point to Settings (which currently has *no* nav entry — a real discoverability gap today).

---

## 3. Per-screen reflow

General rule: **desktop multi-column grids collapse to a single stacked column** on mobile, ordered by priority (numbers first, input second).

### 3.1 Home
- [ ] **Lead with numbers, not the form.** Order on mobile: greeting → 3 stat cards → "This month" card → recent activity. The big "New transaction" form moves *out* of the page flow into the quick-add sheet (§4).
- [ ] The 3 stat cards (Today's Net / This Month / Savings Rate) become a **3-up compact row** or a horizontal-scroll strip — not three stacked full-width cards (wastes vertical space).
- [ ] "This month" Grade card, the green/red split bar, and the ranked categories stack full-width.
- [ ] Recent activity: each row full-width, whole row tappable.

### 3.2 Transactions ("Activity")
- [ ] Income / Expense / Net summary → 3-up compact row.
- [ ] **Filter pills overflow on phones.** The `Day / Week / Month / Year / Overall` row and the `All / Income / Expense` row must become a **single horizontally-scrollable row** (`overflow-x: auto; flex-wrap: nowrap;`) with momentum scroll, OR collapse the period selector into a `<select>`/dropdown. Don't let them wrap into a tall pill cloud.
- [ ] Transaction rows: **make the whole row tappable** to edit, not just the tiny pencil icon (current pencil is well below 44px). Keep an explicit edit affordance but enlarge its hit area.
- [ ] Sticky date-group headers ("2d ago · Jun 14") are fine; ensure they don't overlap the fixed top bar.

### 3.3 Recurring
- [ ] Rows stack full-width. Keep the "In 2d / Jun 30" due badge + amount right-aligned.
- [ ] "New recurring" button: on mobile, move it into the header as an icon-button or rely on the same `+` pattern — don't let a wide button push layout.
- [ ] Same enlarged tap-target rule as Transactions.

### 3.4 Report
- [ ] Top metric cards (Income/Expense/Net/Daily avg) → 2×2 grid on mobile.
- [ ] Financial Grade card and 6-month trend chart stack **full-width, one per row**. Verify chart **legends and axis labels don't get crushed** at narrow width — give the legend its own row above/below the chart.
- [ ] Spending-by-category (donut + list) and Top Expenses stack vertically.
- [ ] Insights cards: single column (or 2-up if they stay legible).

### 3.5 Settings
- [ ] The two-pane (left menu + right content) layout collapses: show the section list, tapping a section pushes to its detail (or use an accordion). Don't show both panes side-by-side on mobile.
- [ ] Add a clear **back** affordance when in a sub-section.

---

## 4. Quick-add bottom sheet (the "+" action)

- [ ] Build a `<QuickAddSheet>` that slides up from the bottom (`transform: translateY(100%) → 0`), with a dimmed scrim behind it.
- [ ] **Prioritize fields for a small screen:** show **amount + "what for" + tag chips + Save** immediately. Tuck **Note** and **Date** under a "More details" toggle so the sheet doesn't get tall. (Date defaults to today; most entries won't change it.)
- [ ] Amount field gets focus on open and triggers the **numeric keypad**: `inputMode="decimal"` (and `type="text"` with your own formatting, or `type="number"` — `inputMode` is what controls the keypad).
- [ ] Save button is full-width, orange, in the thumb zone.
- [ ] Sheet respects `env(safe-area-inset-bottom)`.
- [ ] Dismiss on: scrim tap, swipe-down, and an explicit X.
- [ ] **Reuse the existing form logic/state** — this is a layout container around the same submit handler, not a new form.

> Implementation note: a fixed-position sheet + scrim is standard. If you prefer not to hand-roll focus-trap/scroll-lock/swipe, a small headless library (e.g. a drawer/sheet primitive) saves time and gets accessibility right.

---

## 5. Touch targets & input ergonomics

- [ ] Every interactive element ≥ **44×44px** hit area (use padding to grow the hit area even when the icon is small).
- [ ] Increase spacing between adjacent tappable items (filter pills, edit icons) to prevent mis-taps.
- [ ] Set correct `inputMode` on all inputs: `decimal` for money, `search` for the transactions search, etc. — surfaces the right mobile keyboard.
- [ ] Search field: full-width on mobile.
- [ ] Ensure tab/sheet animations are GPU-friendly (`transform`/`opacity` only) and honor `prefers-reduced-motion`.

---

## 6. Bug to fix (found in current build)

- [ ] **Untranslated i18n key leaking to UI.** Settings shows the literal string `pwa_install_title` instead of rendered copy (should read e.g. "Install Odemes"). The key is missing from the active language file. Add it, and **grep for other raw keys** (`*_title`, `pwa_*`, etc.) rendering literally.

---

## 7. PWA polish (you're most of the way there)

The meta tags already make this an installable PWA (`apple-mobile-web-app-capable`, `mobile-web-app-capable`, `theme-color`, `viewport-fit=cover`). To capitalize on mobile:

- [ ] Verify the web app manifest has correct `name`, `short_name`, `start_url`, `display: standalone`, theme/background colors, and **maskable icons** (192px + 512px).
- [ ] Test "Add to Home Screen" on real iOS Safari and Android Chrome — confirm it launches standalone (no browser chrome) and the status bar color is right.
- [ ] Wire the in-app "Install Odemes" entry (the one currently showing the raw key) to the `beforeinstallprompt` event on Android; on iOS, show brief manual instructions.

---

## 8. Acceptance criteria (QA on real devices)

Test on at least one small iOS (e.g. iPhone SE / 375px) and one Android. Tick only after passing on hardware, not just emulator.

- [ ] No horizontal scroll on any screen at 375px width.
- [ ] Bottom tab bar visible and reachable one-handed on every main screen; correct tab highlighted per route.
- [ ] Every primary destination reachable in ≤ 1 tap from the tab bar; Settings reachable from the header avatar.
- [ ] Quick-add: open → enter amount with numeric keypad → save → sheet dismisses → entry appears. ≤ a few taps total.
- [ ] No content hidden behind the tab bar or the home indicator (safe-area respected).
- [ ] All filter/pill rows scroll horizontally instead of wrapping or overflowing.
- [ ] All tap targets ≥ 44px; no accidental mis-taps on adjacent controls.
- [ ] Charts on Report remain legible (labels/legends not clipped) at 375px.
- [ ] No raw i18n keys visible anywhere.
- [ ] Pinch-zoom still works (accessibility).
- [ ] Installs to home screen and launches standalone on iOS + Android.

---

## 9. Suggested build order (lowest risk → highest value)

1. Global setup (§1) + breakpoint + mobile-first scaffolding.
2. Bottom tab bar (§2) — biggest single UX win; unblocks everything else.
3. Home reflow (§3.1) + quick-add sheet (§4) — the core daily loop.
4. Transactions reflow + scrollable filters (§3.2).
5. Recurring, Report, Settings reflow (§3.3–3.5).
6. Touch-target + input-mode sweep (§5).
7. i18n bug + key grep (§6).
8. PWA verification (§7) + full device QA (§8).

> Scope reminder: items 1–5 are layout/CSS + one new nav component + one new sheet component. No business logic, data, or visual-design changes. Budget accordingly — this is a contained pass, not a rebuild.
