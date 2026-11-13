# Fledge documentation

Bilingual documentation for [Fledge](https://github.com/HugoXK/fledge), published at <https://fledge-docs.hugoxk.online/>.

- English: `/`
- 中文: `/zh/`

Every public page exists in both languages and carries the same sections: `content/en/<slug>.md` and `content/zh/<slug>.md`. The site is a curated introduction and tutorial, not a mirror of the product repository. Deep reference material and design decisions stay in the Fledge repository and are linked from the pages.

The landing includes a browser-only Fledge simulation (plan → failing test → fix → pull request → human review). It makes no model calls and touches no repositories.

## Build

```sh
npm install
npm run build
```

The site is written to `site/`.
