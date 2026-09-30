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

## Project architecture

- Keep EchoLeaf as a frontend-only TanStack Start MVP with browser recording/geolocation and local persistence; this preserves a reliable hackathon demo without backend setup.
- Keep species analysis behind the `analyzeAudio` boundary so demo results can be replaced by a real classifier without changing the user flow.
