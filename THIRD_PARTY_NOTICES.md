# Third-party notices and source credits

Tamil Stoic is an open-source reader for Thirukkural. The project is not a single-license bundle: the application, the adapted Kural dataset, and the bundled fonts retain their respective licenses. The in-app **Credits & open source** section links to these notices and license texts.

## Application code and original work

The Tamil Stoic application code, original English meanings, interface copy, and project artwork are © 2026 pewsaipie and distributed under the MIT License (`LICENSE`). Original simple-English meanings were written for this project from the public-domain prose source noted below. Evidence-backed textual edits are itemized in [`scripts/content-corrections.json`](scripts/content-corrections.json); the review scope is documented in [`docs/content-review.md`](docs/content-review.md).

Source repository: <https://github.com/pewsaipie/tamil-stoic-app>

## Thirukkural text and structure

Tamil text, transliterations, and chapter/section structure in the generated dataset are derived from **tk120404/thirukkural**, following the Parimelalagar-based recension. The upstream dataset is licensed under the Apache License, Version 2.0. The app's generated `data/kurals.js` retains this attribution in its header; the build pipeline and project-side editorial corrections are in `scripts/build-kurals.mjs` and `scripts/content-corrections.json`.

- Source dataset: <https://github.com/tk120404/thirukkural>
- License: [Apache License 2.0](assets/licenses/Apache-2.0.txt)

## Historical English source

The English verse translations and prose explanations are attributed to **G. U. Pope**, with **W. H. Drew, John Lazarus, and F. W. Ellis** (1886). This historical work is in the public domain. It is included via the upstream `tk120404/thirukkural` dataset. The simple-English meanings displayed by Tamil Stoic are new project-authored explanations based on Pope's prose; they are not represented as Pope's words.

## Bundled typefaces

Font files are self-hosted from [Fontsource](https://fontsource.org/) to support offline reading. The font software is licensed under the SIL Open Font License, Version 1.1; the full license and font copyright notices are included in [`assets/licenses/OFL-1.1.txt`](assets/licenses/OFL-1.1.txt).

| Typeface | Copyright / source | Fontsource package page |
| --- | --- | --- |
| Inter | The Inter Project Authors · <https://github.com/rsms/inter> | <https://fontsource.org/fonts/inter> |
| EB Garamond | Georg A. Duffner; The EB Garamond Project Authors · <https://github.com/octaviopardo/EBGaramond12> | <https://fontsource.org/fonts/eb-garamond> |
| Noto Serif Tamil | The Noto Project Authors · <https://github.com/notofonts/tamil> | <https://fontsource.org/fonts/noto-serif-tamil> |

## Runtime and development tools

The published reader has no third-party JavaScript runtime dependencies and makes no third-party font or script requests. Listen uses the browser/operating-system Web Speech API; speech voices are supplied by the reader's device and are not bundled with this project. `jsdom` and `axe-core` are used only by the repository's development/CI checks and are not shipped by the website.

## License files

- Project: [`LICENSE`](LICENSE) (MIT)
- Upstream dataset: [`assets/licenses/Apache-2.0.txt`](assets/licenses/Apache-2.0.txt)
- Bundled fonts: [`assets/licenses/OFL-1.1.txt`](assets/licenses/OFL-1.1.txt)
