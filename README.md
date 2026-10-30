# Fledge documentation site

Static documentation for [Fledge](https://github.com/HugoXK/fledge), published at
<https://fledge-docs.hugoxk.online/> and mirrored at
<https://hugoxk.online/fledge/docs/>.

The site is built from the product repository's `README.md`, `README.zh.md` and
`docs/` on a schedule; the docs are not copied or pinned here. `docs/` in this
repo only owns the stylesheet and logo.

## Local build

```sh
npm install
FLEDGE_DIR=../fledge BASE_PATH=/docs OUT_DIR=site npm run build
# or for the hugoxk.online mirror:
FLEDGE_DIR=../fledge BASE_PATH=/fledge/docs OUT_DIR=site-mirror npm run build
```

## License

The documentation and this build are part of Fledge, Apache-2.0.
