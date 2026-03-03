Read the codebase before making any changes. Make minimal, incremental edits only.
Do not change anything not listed here. After all changes, list every file modified.

DASHBOARD
1. Remove the "Export Report" button from the dashboard header.
2. Remove the "New Invoice" button from the dashboard header —
   the sidebar already has "+ Add", no need for two entry points.

INVOICE LIST — Filters bar
3. Move the Vendor search input to the header area (next to the sort/page controls)
   as a standalone search box — it is a search, not a filter. Label it "Search".
4. Keep Status, Export Status, and Category as the 3 filters in the filter bar.
5. Add a "Paid" filter (All / Paid / Unpaid) to the filter bar as a 4th option.

INVOICE LIST — Bulk actions bar
6. Keep "Validate" and "Mark as Paid" as visible primary action buttons.
7. Move "Mark as Unpaid", "Set Incoming", "Set Outgoing", and "Archive"
   into a "⋯ More ▾" dropdown button on the right side of the bulk actions bar.
   The bar should look like:
   [ Validate ]  [ Mark as Paid ]  [ ⋯ More ▾ ]  ----  Clear selection
   The More dropdown contains: Mark as Unpaid | Set Incoming | Set Outgoing | Archive

INVOICE LIST — Direction column
8. Replace "← In" / "→ Out" text with a small colored badge:
   "IN" in blue, "OUT" in orange. Consistent with Status and Category badge style.
   