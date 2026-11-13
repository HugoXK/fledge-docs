# Fledge documentation site

Bilingual static documentation for [Fledge](https://github.com/HugoXK/fledge), published at <https://fledge-docs.hugoxk.online/>.

- English: `/`
- 中文: `/zh/`

The English pages are built from `HugoXK/fledge` (`README.md` and `docs/`). The Chinese pages are maintained in `translations/zh/` so the product repository stays English-only. Both languages share the same navigation structure; untranslated reference pages are listed under **英文参考** with an `EN` mark and are not mixed into the Chinese pages.

The landing page includes a browser-only Fledge simulation (plan → test → PR → human review). It makes no model calls and touches no repositories.

## Build

```sh
npm install
FLEDGE_DIR=../fledge npm run build
```

`FLEDGE_DIR` points at a checkout of `HugoXK/fledge`. The site is written to `site/`.
