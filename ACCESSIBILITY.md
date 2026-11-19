# Accessibility

What is checked automatically, how the grid works with the keyboard, and the checklist to run by hand before a release.

## What is checked automatically

`e2e/accessibility.spec.ts` runs axe-core over the demo's flagship grid with the structural and ARIA rules the grid is responsible for
(roles, required parents and children, attribute validity, button and label names, table headers, duplicate ids). Colour contrast is left
out on purpose: it depends on the theme the application picks, not on the grid's markup.

`e2e/virtualization.spec.ts` checks the keyboard on the 5,000-row virtual grid of the demo (below).

What axe does not prove: whether a keyboard user can operate the grid, or what a screen reader says. That is the checklist at the end.

## Keyboard

The grid is one tab stop (roving tabindex): Tab enters on the first column header and the arrow keys move inside.

| Key | Does |
| --- | --- |
| Arrow keys | Move one cell |
| Home / End | First / last cell of the row |
| Ctrl+C / Ctrl+V on a cell | Copy / paste, when `clipboard` is on |

PageUp, PageDown and Ctrl+Home / Ctrl+End are not implemented in this package (the React and Vue versions have them).

### With `virtualScroll`

Only the rows near the viewport are in the DOM, so a move that walks the DOM alone would lose keys and focus:

- ArrowDown and ArrowUp work on the row **index**. A move to a row that is not rendered yet scrolls it into view and focuses the cell once
  it has rendered, so a fast run of arrow keys never loses a key at the edge of the window. Each rendered row carries
  `data-virtual-index`, its position among all the rows.
- If the focused cell's row scrolls out of the window (mouse wheel, scrollbar, code), focus waits on the grid's scrollable area instead of
  falling to `<body>`, where Tab would restart from the top of the page. When the row is rendered again, focus returns to that cell.
- ArrowUp from the first data row goes to the header, as in a grid without virtualization.
- The CDK measures the viewport when it is created and, by itself, when the browser window is resized. The grid also asks it to measure
  again whenever the viewport's own size changes, so a grid created while hidden (a tab, a collapsed section) fills its viewport when shown.

## Manual checklist before a release

Keyboard only (no mouse), in a real browser, with the application's own styling:

- [ ] Tab reaches the grid once, and Shift+Tab leaves it; the focused cell has a visible focus indicator.
- [ ] Arrow keys, Home and End move as in the table above, also with `virtualScroll` on a long list.
- [ ] The header controls (sort, column filters), the search box and the pager can be reached and used, in a sensible order, and the sort direction is announced.
- [ ] Grouping: the group header rows are read with their count of rows.
- [ ] Editing: Edit puts focus in the first editor, Save and Cancel are reachable, a validation message is announced and the invalid field is identified, and after Save or Cancel focus is somewhere sensible.
- [ ] Selection: the row checkboxes and "select all" can be operated; the selection count is announced.
- [ ] The export buttons have names (icons alone are not enough) and the download or print dialog does not trap focus.
- [ ] With a screen reader (NVDA or VoiceOver): the table is announced with its row and column counts, header cells are read with each data cell, and a virtual grid reports the full `aria-rowcount`.
