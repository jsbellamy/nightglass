# PROTOTYPE — Live Battlefield workspace

Throwaway UI prototype answering:

> What compact window dimensions, Battlefield composition, Formation spacing,
> opponent capacity, and expanding management layout keep three animated Party
> Members and their Ability effects readable while preserving the live fight?

Run from the project root:

```sh
./prototype/live-battlefield/run.sh
```

Open <http://127.0.0.1:4173>. Variants are shareable as `?variant=A`,
`?variant=B`, and `?variant=C`.

This is disposable layout code. It intentionally uses CSS placeholder art and
has no production architecture, persistence, or combat simulation. The second
iteration tests fixed footprints from 480×112 down to 320×220 and treats a
32×48 Character canvas as 32×48 screen pixels—no runtime downscaling.
