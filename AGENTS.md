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

- Public marketing pages share `src/components/Marketing.tsx` while owner routes stay independent, so brand changes do not alter operations.
- Demo and pilot interest reuse `frontdesk_pilot_interests` with source and request markers in `notes`, so no production schema migration is needed.
- Public branding is Callwoven; internal database, webhook and integration identifiers retain their existing FrontDesk names to preserve compatibility.
- Portal access is decided only by backend role/membership tables (via get_my_portal_access and private.* RLS helpers), never by email lists or which login page was used, so login pages cannot grant access.
