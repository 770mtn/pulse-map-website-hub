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

## Project rules
- Public order flow runs through server functions in src/lib/public.functions.ts using the admin client; phone OTP verify_token gates address lookup and submission (no public table access).
- Admin area is /admin (client-only, in-component login); staff permissions come from user_roles via is_staff/has_role.
- SMS goes through src/lib/sms.server.ts (Pulseem SOAP); every send is logged to sms_log. Without Pulseem secrets, OTP code is returned to the UI for testing.
- Follow-ups/escalations run from the daily managed cron route /api/public/jobs/followup.
- Product images are stored as compressed data URLs because public storage buckets are blocked in this workspace.
