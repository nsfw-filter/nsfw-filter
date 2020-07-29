![](./demo/images/preview.png)

<p align="center">
  <img alt="GitHub release (latest by date including pre-releases)" src="https://img.shields.io/github/v/release/navendu-pottekkat/nsfw-filter?include_prereleases&style=flat-square">
  <a href="https://github.com/navendu-pottekkat/nsfw-filter/commits/master">
  <img src="https://img.shields.io/github/last-commit/navendu-pottekkat/nsfw-filter?style=flat-square"
         alt="GitHub last commit">
  <a href="https://github.com/navendu-pottekkat/nsfw-filter/issues">
  <img src="https://img.shields.io/github/issues/navendu-pottekkat/nsfw-filter?style=flat-square&color=red"
         alt="GitHub issues">
  <a href="https://github.com/navendu-pottekkat/nsfw-filter/pulls">
  <img src="https://img.shields.io/github/issues-pr/navendu-pottekkat/nsfw-filter?style=flat-square&color=blue"
         alt="GitHub pull requests">
  </br>

  <img alt="Contributors" src="https://img.shields.io/badge/all_contributors-5-orange.svg?style=flat-square" href="#contributors-">
  <img alt="Contributing" src="https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg" href="code_of_conduct.md">
  <img alt="GitHub" src="https://img.shields.io/github/license/navendu-pottekkat/nsfw-filter?style=flat-square&color=yellow">
    <a href="https://twitter.com/intent/tweet?text=Try this Chrome Extension that filters out NSFW images from your browser:&url=https%3A%2F%2Fnavendu.me%2Fnsfw-filter%2Findex.html">
  <img src="https://img.shields.io/twitter/url?style=flat-square&logo=twitter&url=https%3A%2F%2Fnavendu.me%2Fnsfw-filter%2Findex.html"
       alt="GitHub tweet"></a>
</p>

# NSFW Filter

[<img src="https://github.com/navendu-pottekkat/nsfw-filter/blob/master/demo/images/download.png" align="right"
     alt="Download now" width="120" height="178">](https://github.com/navendu-pottekkat/nsfw-filter/archive/master.zip)

A Web extension that filters out NSFW images from websites.

It uses TensorFlow JS- a Machine Learning framework- to check for NSFW images when a web page is loaded.

When a web page is loaded, all the images remain hidden until they are found to be NSFW or not. If they are found to be NSFW, they remain hidden. Otherwise, they become visible.

***The extension runs completely on your browser. i.e No user data is being sent to a server for processing.***

Model used- [**nsfwjs**](https://github.com/infinitered/nsfwjs) devoleped by [**Infinite Red, Inc.**](https://github.com/infinitered)

[<img src="https://github.com/navendu-pottekkat/files/blob/master/nsfw-filter/source.gif" align="center"
     alt="Download now" width="120">](https://github.com/navendu-pottekkat/nsfw-filter/archive/master.zip)
<img src="https://github.com/navendu-pottekkat/files/blob/master/nsfw-filter/chrome.gif" align="center"
     alt="Download now" width="120">
[<img src="https://github.com/navendu-pottekkat/files/blob/master/nsfw-filter/firefox.gif" align="center"
     alt="Download now" width="120">](https://addons.mozilla.org/en-US/firefox/addon/nsfw-filter/)

[**Download NSFW Filter**](https://github.com/navendu-pottekkat/nsfw-filter/archive/master.zip) | [**Download for Firefox**](https://addons.mozilla.org/en-US/firefox/addon/nsfw-filter/) | **Coming soon on Chrome Web Store!**

Supported browsers: [**Google Chrome**](#adding-to-chrome), [**Mozilla Firefox**](#adding-to-firefox).

Reach out to us! Join the [**Slack channel**](https://join.slack.com/t/nsfwfilter/shared_invite/zt-gfx0dewg-Hc0~3gu4jXcCDYWQxu3lZA).

# What's new?

**v1.0.0** released!

The images are now hidden when a page loads and become visible only when they are found to be not NSFW. The NSFW images remain hidden.

Performance improvements.

Bug fixes.

# Demo

The website used in this demo is [**scroller/nsfw**](https://scrolller.com/nsfw), which randomly loads NSFW images.

When the extension is installed, the images in the page is hidden.

**You can try loading the same website with and without the extension to see it work. (The page may contain images that are innapropriate for some users)**

Check [**DEMO.md**](./DEMO.md) for more.

![](demo/images/demo_new.gif)

# Table of contents

- [NSFW Filter](#nsfw-filter)
- [What's new?](#what-)
- [Demo](#demo)
- [Table of contents](#table-of-contents)
- [Installation](#installation)
    - [Adding to Chrome](#adding-to-chrome)
    - [Adding to Firefox](#adding-to-firefox)
- [Usage](#usage)
- [Development](#development)
    - [Dependencies](#dependencies)
    - [Project tree](#project-tree)
    - [Guidelines](#guidelines)
- [Contribute](#contribute)
    - [Contributors ✨](#contributors-)
    - [Sponsor](#sponsor)
    - [Adding new features or fixing bugs](#adding-new-features-or-fixing-bugs)
- [License](#license)
- [Privacy](#privacy)

# Installation
[(Back to top)](#table-of-contents)

These instructions are for **developers(and Chrome users**- since NSFW Filter is not available in the Chrome Webstore yet!).

You can download for use directly from [**addons.mozilla/nsfw-filter**](https://addons.mozilla.org/en-US/firefox/addon/nsfw-filter/).

Clone this repository and navigate inside the project folder and install the dependencies by running:

```
npm ci
```

After installing the dependencies, build the project by executing:

```
npm run build
```

### Adding to Chrome
[(Back to top)](#table-of-contents)

After you have finished the [Installation](#installation), open Google Chrome and open the Extension Management page by navigating to ```chrome://extensions``` or by opening Settings and clicking Extensions from the bottom left.

Enable Developer Mode by clicking the toggle switch next to Developer mode.

Click the LOAD UNPACKED button and select the extension directory(```.../dist```).

<img src="./demo/images/install_instructions.png" alt="Install Instructions">

Voila! The extension is now installed and ready to be used!

### Adding to Firefox
[(Back to top)](#table-of-contents)

To install the developer version follow the steps below. To just use the extension download from [**addons.mozilla/nsfw-filter**](https://addons.mozilla.org/en-US/firefox/addon/nsfw-filter/)

After finishing [Installation](#installation), open Firefox and open the Debug Add-ons page by navigating to ```about:debugging#/runtime/this-firefox``` or by selecting it from Settings dropdown in the add-ons page.

Click Load Temporary Add-on and select the ```manifest.json``` file from the ```.../dist``` directory.

<img src="./demo/images/install_instructions_firefox.png" alt="Install Instructions">

That's it! The extension is now ready to be used in Firefox!

# Usage
[(Back to top)](#table-of-contents)

After adding the extension to Chrome/Firefox, it will light-up everytime you load a compatable website.

When a page is loaded, the extension would check for images as you scroll across the page and runs the images through the algorithm and if NSFW images are found, it is hidden automatically.

You can toggle(off/on) the extension from the ```chrome://extensions``` page in Chrome and ```about:debugging#/runtime/this-firefox``` in Firefox.

# Development
[(Back to top)](#table-of-contents)

Check the [**wiki**](https://github.com/navendu-pottekkat/nsfw-filter/wiki) for detailed info.

By default the code runs in production mode. This can be disabled during development by commenting out ```tf.enableProdMode ()``` in the ```/src/background.js``` file. This is enabled by default to improve the performance.

### Dependencies
[(Back to top)](#table-of-contents)

```
"@tensorflow/tfjs": "^2.0.1",
"nsfwjs": "^2.2.0"
```

**devDependencies**

```
"parcel-bundler": "^1.12.4"
```

Run ```npm i``` to install the dependencies.

### Project tree
[(Back to top)](#table-of-contents)

```
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── demo
│   └── images
│       ├── banner.png
│       ├── demo.gif
│       ├── demo_new.gif
│       ├── download.png
│       ├── icon32.png
│       ├── install_instructions_firefox.png
│       ├── install_instructions.png
│       ├── logo.png
│       └── preview.png
├── DEMO.md
├── dist
│   ├── images
│   │   ├── icon128.png
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon.png
│   ├── manifest.json
│   └── models
│       ├── group1-shard1of1
│       └── model.json
├── docs
│   └── README.md
├── ISSUE_TEMPLATE.md
├── LICENSE
├── package.json
├── package-lock.json
├── PULL_REQ_TEMPLATE.md
├── README.md
└── src
    ├── background.js
    └── content.js
```

### Guidelines
[(Back to top)](#table-of-contents)

Edit the ```background.js``` and ```content.js``` files in the ```/src``` folder in the root directory and **NOT** the one in ```/dist/src```.

The contents of ```/dist/src``` folder is automatically created when you run ```npm run-script build``` and should **NOT** be tampered.

The model use for this project [nsfwjs](https://github.com/infinitered/nsfwjs) is stored in ```dist/models```. This can be changed to use your own models built using TensorFlow JS. You can read the [docs](https://www.tensorflow.org/js) from TensorFlow to learn more.

While making changes or adding new files, make sure to add it in the ```/dist``` folder and add it to ```/dist/manifest.json``` file.

# Contribute
[(Back to top)](#table-of-contents)

### Contributors ✨
[(Back to top)](#table-of-contents)

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/YegorZaremba"><img src="https://avatars3.githubusercontent.com/u/31797554?v=4" width="100px;" alt=""/><br /><sub><b>Yegor <3</b></sub></a><br /><a href="https://github.com/navendu-pottekkat/nsfw-filter/commits?author=YegorZaremba" title="Code">💻</a> <a href="#design-YegorZaremba" title="Design">🎨</a> <a href="#ideas-YegorZaremba" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="http://navendu.me"><img src="https://avatars1.githubusercontent.com/u/49474499?v=4" width="100px;" alt=""/><br /><sub><b>Navendu Pottekkat</b></sub></a><br /><a href="https://github.com/navendu-pottekkat/nsfw-filter/commits?author=navendu-pottekkat" title="Code">💻</a> <a href="#content-navendu-pottekkat" title="Content">🖋</a> <a href="https://github.com/navendu-pottekkat/nsfw-filter/commits?author=navendu-pottekkat" title="Documentation">📖</a> <a href="#design-navendu-pottekkat" title="Design">🎨</a> <a href="#ideas-navendu-pottekkat" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/anonacc"><img src="https://avatars3.githubusercontent.com/u/64102225?v=4" width="100px;" alt=""/><br /><sub><b>anonacc</b></sub></a><br /><a href="https://github.com/navendu-pottekkat/nsfw-filter/issues?q=author%3Aanonacc" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/abhirammltr"><img src="https://avatars1.githubusercontent.com/u/32649851?v=4" width="100px;" alt=""/><br /><sub><b>Abhiram V V</b></sub></a><br /><a href="https://github.com/navendu-pottekkat/nsfw-filter/commits?author=abhirammltr" title="Code">💻</a> <a href="https://github.com/navendu-pottekkat/nsfw-filter/issues?q=author%3Aabhirammltr" title="Bug reports">🐛</a> <a href="#ideas-abhirammltr" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/yxlin118"><img src="https://avatars1.githubusercontent.com/u/54916304?v=4" width="100px;" alt=""/><br /><sub><b>yxlin118</b></sub></a><br /><a href="https://github.com/navendu-pottekkat/nsfw-filter/issues?q=author%3Ayxlin118" title="Bug reports">🐛</a> <a href="#ideas-yxlin118" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

### Sponsor
[(Back to top)](#table-of-contents)

This is a completely Open Source project and it is free for use. A contribution from you would go a long way to lift my spirits up and push me to build more cool stuff in the future.

You can click this link for sponsoring.

### Adding new features or fixing bugs
[(Back to top)](#table-of-contents)

Check out [Development](#development) for setting up your development environment.

Submit a **pull request**, wait for **review**. I will check(usually) every-other-day.

Refer the [**issue template**](./ISSUE_TEMPLATE.md) and [**pull request**](./PULL_REQ_TEMPLATE.md) template before submitting.

Please follow the [**Code of Conduct**](./CODE_OF_CONDUCT.md).

Contributions of any kind are welcome! Reach out to us through this [**Slack channel**](https://join.slack.com/t/nsfwfilter/shared_invite/zt-gfx0dewg-Hc0~3gu4jXcCDYWQxu3lZA).

# License
[(Back to top)](#table-of-contents)

[GNU General Public License version 3](https://opensource.org/licenses/GPL-3.0)

# Privacy
[(Back to top)](#table-of-contents)

This extension does **NOT** collect and send any user data. All the operations on the images are done locally on the browser.
