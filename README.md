![](./demo/images/preview.png)
<p align="center">
  <a href="https://www.producthunt.com/posts/nsfw-filter?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-nsfw-filter" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=225086&theme=dark" alt="NSFW Filter - Web extension to block NSFW content using AI | Product Hunt Embed" style="width: 250px; height: 54px;" width="250px" height="54px" /></a>
</p>
<p align="center">
  <a href="https://opencollective.com/nsfwfilter/donate" target="_blank">
  <img src="https://opencollective.com/nsfwfilter/donate/button@2x.png?color=blue" width=300 />
</a>  
</p>
  
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

  <img alt="Contributors" src="https://img.shields.io/badge/all_contributors-10-orange.svg?style=flat-square" href="#contributors-">
  <img alt="Contributing" src="https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg" href="code_of_conduct.md">
  <img alt="GitHub" src="https://img.shields.io/github/license/navendu-pottekkat/nsfw-filter?style=flat-square&color=yellow">
    <a href="https://ctt.ac/4e4Jt">
  <img src="https://img.shields.io/twitter/url?style=flat-square&logo=twitter&url=https://ctt.ac/4e4Jt"
       alt="GitHub tweet"></a>
</p>

# NSFW Filter

[<img src="https://github.com/navendu-pottekkat/nsfw-filter/blob/master/demo/images/download.png" align="right"
     alt="Download now" width="120" height="178">](https://github.com/navendu-pottekkat/nsfw-filter/archive/master.zip)

A Web extension that filters out NSFW images from websites.

It uses TensorFlow JS- a Machine Learning framework- to check for NSFW images when a web page is loaded.

When a web page is loaded, all the images remain hidden until they are found to be NSFW or not. If they are found to be NSFW, they remain hidden. Otherwise, they become visible.

***The extension runs completely on your browser. i.e No user data is being sent to a server for processing.***

Read about the release in [**Hacker Noon**](https://hackernoon.com/nsfw-filter-introduction-building-a-safer-internet-using-ai-jq1e3u2f) or in [**Towards Data Science**](https://towardsdatascience.com/building-a-safer-internet-for-everyone-using-ai-175df5e02cee).

Model used- [**nsfwjs**](https://github.com/infinitered/nsfwjs) developed by [**Infinite Red, Inc.**](https://github.com/infinitered)

[<img src="https://github.com/navendu-pottekkat/files/blob/master/nsfw-filter/source.gif" align="center"
     alt="Download now" width="120">](https://github.com/navendu-pottekkat/nsfw-filter/archive/master.zip)
[<img src="https://github.com/navendu-pottekkat/files/blob/master/nsfw-filter/chrome.gif" align="center"
     alt="Download now" width="120">](https://chrome.google.com/webstore/detail/nsfw-filter/kmgagnlkckiamnenbpigfaljmanlbbhh)
[<img src="https://github.com/navendu-pottekkat/files/blob/master/nsfw-filter/firefox.gif" align="center"
     alt="Download now" width="120">](https://addons.mozilla.org/en-US/firefox/addon/nsfw-filter/)

[**Download NSFW Filter**](https://github.com/navendu-pottekkat/nsfw-filter/archive/master.zip) | [**Download for Chrome**](https://chrome.google.com/webstore/detail/nsfw-filter/kmgagnlkckiamnenbpigfaljmanlbbhh) | [**Download for Firefox**](https://addons.mozilla.org/en-US/firefox/addon/nsfw-filter/)

Supported browsers: [**Google Chrome**](#adding-to-chrome), [**Mozilla Firefox**](#adding-to-firefox).

Reach out to us! Join the [**Slack channel**](https://join.slack.com/t/nsfwfilter/shared_invite/zt-gt1lgdiv-K2VR~UVUxwaTPWCLSmDiug).

# Demo

As you can see below, the NSFW content in Google Images are hidden as soon as the page is loaded.

**You can try loading the same page with and without the extension to see it work. (The page may contain images that are innapropriate for some users)**

Check [**DEMO.md**](./DEMO.md) for more.

![](demo/images/demo_google.gif)

# Table of contents

- [NSFW Filter](#nsfw-filter)
- [Demo](#demo)
- [Table of contents](#table-of-contents)
- [Installation](#installation)
    - [Adding to Chrome](#adding-to-chrome)
    - [Adding to Firefox](#adding-to-firefox)
- [Usage](#usage)
- [Contribute](#contribute)
    - [Contributors ✨](#contributors-)
    - [Sponsor](#sponsor)
- [License](#license)
- [Privacy](#privacy)

# Installation
[(Back to top)](#table-of-contents)

These instructions are for **developers**.

You can download for use directly from [**chrome.google.com/webstore/nsfw-filter**](https://chrome.google.com/webstore/detail/nsfw-filter/kmgagnlkckiamnenbpigfaljmanlbbhh) and [**addons.mozilla/nsfw-filter**](https://addons.mozilla.org/en-US/firefox/addon/nsfw-filter/).

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

To install the developer version follow the steps below. To just use the extension download from [**chrome.google.com/webstore/nsfw-filter**](https://chrome.google.com/webstore/detail/nsfw-filter/kmgagnlkckiamnenbpigfaljmanlbbhh)

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

When a page is loaded, the extension would hide all the images in the page and only show images that have been classified as **NOT NSFW**.

You can toggle(off/on) the extension from the ```chrome://extensions``` page in Chrome and ```about:debugging#/runtime/this-firefox``` in Firefox.

![](http://www.plantuml.com/plantuml/proxy?cache=no&src=https://raw.githubusercontent.com/nsfw-filter/nsfw-filter/master/demo/UML/activity-diagram.plantuml)

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
    <td align="center"><a href="https://github.com/YegorZaremba"><img src="https://avatars3.githubusercontent.com/u/31797554?v=4" width="100px;" alt=""/><br /><sub><b>Yegor <3</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/commits?author=YegorZaremba" title="Code">💻</a> <a href="#design-YegorZaremba" title="Design">🎨</a> <a href="#ideas-YegorZaremba" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="http://navendu.me"><img src="https://avatars1.githubusercontent.com/u/49474499?v=4" width="100px;" alt=""/><br /><sub><b>Navendu Pottekkat</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/commits?author=navendu-pottekkat" title="Code">💻</a> <a href="#content-navendu-pottekkat" title="Content">🖋</a> <a href="https://github.com/nsfw-filter/nsfw-filter/commits?author=navendu-pottekkat" title="Documentation">📖</a> <a href="#design-navendu-pottekkat" title="Design">🎨</a> <a href="#ideas-navendu-pottekkat" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/anonacc"><img src="https://avatars3.githubusercontent.com/u/64102225?v=4" width="100px;" alt=""/><br /><sub><b>anonacc</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3Aanonacc" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/abhirammltr"><img src="https://avatars1.githubusercontent.com/u/32649851?v=4" width="100px;" alt=""/><br /><sub><b>Abhiram V V</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/commits?author=abhirammltr" title="Code">💻</a> <a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3Aabhirammltr" title="Bug reports">🐛</a> <a href="#ideas-abhirammltr" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/yxlin118"><img src="https://avatars1.githubusercontent.com/u/54916304?v=4" width="100px;" alt=""/><br /><sub><b>yxlin118</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3Ayxlin118" title="Bug reports">🐛</a> <a href="#ideas-yxlin118" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://clay.sh"><img src="https://avatars3.githubusercontent.com/u/16675291?v=4" width="100px;" alt=""/><br /><sub><b>Clay McGinnis</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/pulls?q=is%3Apr+reviewed-by%3AClayMav" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://www.youtube.com/channel/UCPGv2tVqEt6iBFnnMTjnRBA"><img src="https://avatars1.githubusercontent.com/u/6668371?v=4" width="100px;" alt=""/><br /><sub><b>Brady Dowling</b></sub></a><br /><a href="#ideas-bradydowling" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
  <tr>
    <td align="center"><a href="http://littlebluelabs.com"><img src="https://avatars2.githubusercontent.com/u/32261?v=4" width="100px;" alt=""/><br /><sub><b>Mike Crittenden</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/commits?author=mikecrittenden" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/garfieldbanks"><img src="https://avatars3.githubusercontent.com/u/12904270?v=4" width="100px;" alt=""/><br /><sub><b>garfieldbanks</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3Agarfieldbanks" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/TitusRobyK"><img src="https://avatars1.githubusercontent.com/u/32787952?v=4" width="100px;" alt=""/><br /><sub><b>Titus Roby K</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3ATitusRobyK" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/hsusanoo"><img src="https://avatars2.githubusercontent.com/u/35850056?v=4" width="100px;" alt=""/><br /><sub><b>Haitam</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3Ahsusanoo" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/lizhendong128"><img src="https://avatars3.githubusercontent.com/u/24618122?v=4" width="100px;" alt=""/><br /><sub><b>lizhendong128</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3Alizhendong128" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/Woctor-Dho"><img src="https://avatars3.githubusercontent.com/u/25572322?v=4" width="100px;" alt=""/><br /><sub><b>Woctor-Dho</b></sub></a><br /><a href="#ideas-Woctor-Dho" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/miaokun-normal"><img src="https://avatars2.githubusercontent.com/u/67724210?v=4" width="100px;" alt=""/><br /><sub><b>miaokun-normal</b></sub></a><br /><a href="https://github.com/nsfw-filter/nsfw-filter/issues?q=author%3Amiaokun-normal" title="Bug reports">🐛</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

Please check the [**Contributing Guidelines**](https://github.com/navendu-pottekkat/nsfw-filter/blob/master/CONTRIBUTING.md) before contributing.

### Sponsor
[(Back to top)](#table-of-contents)

This is a completely Open Source project and it is free for use.

Help us in keeping this project maintained.

You can sponsor on [Open Collective](https://opencollective.com/nsfwfilter/donate) or [become a Patron](https://www.patreon.com/bePatron?u=41162696).

# License
[(Back to top)](#table-of-contents)

[GNU General Public License version 3](https://opensource.org/licenses/GPL-3.0)

# Privacy
[(Back to top)](#table-of-contents)

This extension does **NOT** collect and send any user data. All the operations on the images are done locally on the browser.
