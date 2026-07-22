# Taskflow “Quiet Workspace” Redesign

## Goal

Redesign Taskflow as a modern, minimalist productivity workspace using a neutral black-and-white palette with one blue accent. The interface should feel calm, spacious, and easy to scan while retaining every current feature and existing JavaScript behavior.

## Visual Direction

- Use white and soft-gray surfaces, near-black primary text, muted gray secondary text, and blue only for primary actions, focus states, selected filters, and meaningful progress.
- Remove the decorative gradient and floating orb treatment. Use subtle borders and restrained shadows to establish hierarchy.
- Use Inter with a clear type scale, strong headings, compact metadata, and comfortable line height.
- Keep corner radii moderate and consistent. Avoid glassmorphism, colorful gradients, and emoji as primary interface chrome where simple text or symbols are clearer.
- Retain a dark theme, expressed as neutral graphite surfaces with the same blue accent.

## Information Architecture

### Login

Present a focused sign-in panel with the Taskflow wordmark, a short sync explanation, one username field, and one blue primary button. Keep the existing username validation and setup-modal behavior.

### Application Header

Use a slim header with the product identity and signed-in user visible. Keep theme switching immediately accessible. Group user listing, import, export, and logout into a compact secondary-actions menu to reduce clutter while preserving their existing element IDs and event behavior.

### Main Workspace

Use a centered workspace with a readable maximum width. Order content as:

1. Page greeting/context and compact statistics.
2. A clear task composer with the title input as the dominant control.
3. Secondary task options for priority, category, due date, subtasks, and daily recurrence.
4. Search, date filtering, and status tabs.
5. The task list and completed-task bulk action.

On wider screens, statistics appear as a single quiet row. On narrow screens, they wrap into a two-column grid without horizontal scrolling.

## Components and States

- **Statistics:** compact bordered cards with tabular numbers; color remains neutral except for the blue active emphasis and semantic warning/success values.
- **Task composer:** one bordered panel with strong focus treatment. Secondary controls are visually quieter than the task title and Add button.
- **Filters:** search remains flexible; status filters use a segmented-control pattern with blue for the selected state.
- **Task cards:** flat white/graphite surfaces, subtle borders, clear task title, subdued metadata chips, and actions revealed on hover or always visible on touch layouts.
- **Modals:** consistent surface, spacing, inputs, and button hierarchy. Overlays retain click-to-dismiss behavior where already supported.
- **Empty/loading/toast states:** simplified and readable, retaining all current state classes and JavaScript hooks.
- **Focus and motion:** visible keyboard focus rings; short, subtle transitions; respect `prefers-reduced-motion`.

## Behavior and Data Flow

The redesign is presentational. Existing Supabase loading, authentication-by-username, task CRUD, filtering, sorting, recurring tasks, subtasks, import/export, user listing, theme persistence, modals, and toast behavior remain unchanged.

All IDs queried by `app.js` remain available. Existing state classes such as `active`, `visible`, `completed`, `progress`, `removing`, and `light-mode` retain compatible meanings. Small markup additions are allowed for layout, labels, and the compact menu, but no database or API changes are included.

The compact menu will use native HTML disclosure where practical so its actions remain usable without adding a separate JavaScript state system. Existing buttons remain the event targets.

## Responsive and Accessibility Requirements

- Support mobile widths down to 320 px without clipped controls or horizontal page scrolling.
- Use semantic landmarks, explicit form labels (visually hidden where necessary), descriptive button labels, and `aria` attributes for icon-only controls.
- Maintain adequate contrast in light and dark themes.
- Ensure hover-only affordances are also available through keyboard focus and touch breakpoints.
- Keep tap targets approximately 40–44 px where space permits.

## Error Handling

No application error-flow changes are required. Existing toast and loading behavior remains authoritative. The redesigned styles must visibly distinguish success, error, warning, disabled, loading, and overdue states in both themes.

## Verification

- Confirm every DOM ID referenced by `app.js` still exists exactly once.
- Verify login, setup, add, edit, delete, status changes, filtering, subtasks, recurrence, import/export, user listing, theme switching, and logout remain reachable.
- Inspect desktop and mobile layouts, including empty, loading, completed, progress, overdue, modal, toast, and long-title states.
- Check keyboard navigation, visible focus, contrast, reduced-motion behavior, and absence of horizontal overflow.
- Validate the HTML and run a JavaScript syntax check.

## Out of Scope

- Changes to Supabase schema, credentials, authentication model, or deployment.
- New task features or changes to task semantics.
- Framework adoption or build tooling; the project remains vanilla HTML, CSS, and JavaScript.
