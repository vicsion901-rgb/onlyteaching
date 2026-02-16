# Learnings

## State Persistence with Navigation
When using `navigate` immediately after a state update in React:
- State updates via `useState` setter are async and might be batched or cancelled if the component unmounts.
- `localStorage.setItem` is synchronous and ensures data is persisted even if the component unmounts immediately.
- `useState(() => localStorage.getItem(...))` lazy initialization ensures the component rehydrates with the latest data upon remounting (e.g., returning via Back button).

## Component Cleanup
- Removed unused Lucide icons to reduce bundle size and visual clutter.
- Standardized on Emojis for consistent visual language across the Dashboard.
