# Proposals

Cross-fragment changes that QA agents must not apply themselves, because the
target node lives in a file they do not own.

Schema — one object per file:

```jsonc
{
  "merges": [
    // fold `from` INTO `to`: re-point every reference at `to`, then delete `from`
    { "from": "mb.pla.fluorspar", "to": "metal.fluorspar",
      "why": "same substance; the metals fragment publishes the canonical node" }
  ],
  "renames": [
    // changing an id is a breaking change for anyone referencing it
    { "id": "metal.zinc-oxide-powder", "to": "metal.zinc-oxide",
      "why": "canonical name; 'powder' is a particle size, not a material" }
  ],
  "note": "anything the reviewer needs to know about this fragment as a whole"
}
```

These are applied centrally by the maintainer, not by the agent. See
`docs/CHECKLIST.md` section 8.
