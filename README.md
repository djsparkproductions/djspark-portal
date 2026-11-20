# djspark-portal

Wedding planning portal theme and script for **DJ Spark Productions**, layered on top of the DJ Event Planner (DJEP) client planning form.

- `portal.css` – dark DJ Spark theme. Every rule is scoped to `html.djsp`, which only exists once the script runs, so a failed script leaves DJEP's plain form untouched.
- `portal.js` – one section per screen with Prev/Next, a section menu with answered counts, overall progress, phone-friendly grids, song-link checks and a save indicator. All answers stay in DJEP's own form fields.
- `form-spec.json` – the question list used to build the DJEP test form.

Loaded from a Comment item at the top of the DJEP planning form. **Rollback:** delete that Comment item (or the `<script>`/`<link>` lines in it) and the form returns to DJEP's default look.
