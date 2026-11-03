<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Persist order item sequence in `order_items.position`; use the same ordering for history, repeat editing and Excel exports so submitted item order stays consistent.
- Keep repeat drafts as ordered snapshot rows rather than deriving them from the catalog, preserving unavailable products and their original units.
- Generate Excel workbooks in the browser with a dynamically imported ExcelJS module; exports use only orders already authorized by the existing read policies.
- Use the shared OrderExportButton for admin orders and stall history so download loading and error handling stay consistent.
