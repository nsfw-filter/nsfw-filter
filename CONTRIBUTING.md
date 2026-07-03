# Contributor Guidelines

Contributions of any kind are welcome! Please read these guidelines before you make a contribution:

1. When contributing to this repository, please discuss the change you wish to make via [issues](https://github.com/nsfw-filter/nsfw-filter/issues).
2. We have a [**code of conduct**](https://github.com/nsfw-filter/nsfw-filter/blob/master/CODE_OF_CONDUCT.md). Please follow it in all your interactions with the project.
3. All code changes take place through [pull requests](https://github.com/nsfw-filter/nsfw-filter/pulls). See [GitHub Flow](https://guides.github.com/introduction/flow/index.html) for more details.
4. Report a bug by [opening a new issue](https://github.com/nsfw-filter/nsfw-filter/issues/new/choose).
5. Try to stick to the issue templates and the pull request template.

## Development

The extension is a TypeScript and React codebase bundled with webpack. You need [Node.js](https://nodejs.org) 20.19 or newer.

Install dependencies:

```bash
npm install
```

Build the extension into `dist/src`:

```bash
npm run build
```

### Running it locally

Start a watch build that rebuilds on every change:

```bash
npm run dev
```

In a separate terminal, launch Chromium with the extension loaded. It reloads as the build updates:

```bash
npm run start:chrome
```

To load a build by hand instead, open `chrome://extensions`, enable **Developer Mode**, click **Load Unpacked**, and select the `dist` directory.

### Tests and linting

Run the full suite (unit and end-to-end):

```bash
npm run test
```

The end-to-end tests drive a real browser, so run just the unit tests for a fast loop:

```bash
npm run test:unit
```

Lint before opening a pull request:

```bash
npm run lint
```

Everything runs on your machine. The model and WebAssembly runtime are bundled, and the extension makes no network requests at runtime. Please keep it that way: no CDNs, remote fonts, analytics, or runtime fetches.
