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
  
  <img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/navendu-pottekkat/nsfw-filter/total?style=flat-square">
  <img alt="Contributing" src="https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg" href="code_of_conduct.md">
  <img alt="GitHub" src="https://img.shields.io/github/license/navendu-pottekkat/nsfw-filter?style=flat-square&color=yellow">
    <a href="https://twitter.com/intent/tweet?text=Try this Chrome Extension that filters out NSFW images from your browser:&url=https%3A%2F%2Fnavendu.me%2Fnsfw-filter%2Findex.html">
  <img src="https://img.shields.io/twitter/url?style=flat-square&logo=twitter&url=https%3A%2F%2Fnavendu.me%2Fnsfw-filter%2Findex.html"
       alt="GitHub tweet"></a>
</p>

# NSFW Filter

<img src="./demo/images/download.png" align="right"
     alt="Download now" width="120" height="178">

A Google Chrome extension that filters out NSFW images from websites.

It uses TensorFlow JS- a Machine Learning framework- to check NSFW images when they are loaded. 

If the loaded images contain NSFW content as predicted by the algorithm, it is replaced by a random image from Unsplash.

Model used [**nsfwjs**](https://github.com/infinitered/nsfwjs) devoleped by [**Infinite Red, Inc.**](https://github.com/infinitered)

# Demo

The website used in this demo is [**scroller/nsfw**](https://scrolller.com/nsfw), which randomly loads NSFW images. 

When the extension is installed, the images in the page is changed to random images from Unsplash.

**You can try loading the same website with and without the extension to see it work. (The page may contain images that are innapropriate for some users)**

![](demo/images/demo.gif)

# Table of contents

- [NSFW Filter](#nsfw-filter)
- [Demo](#demo)
- [Table of contents](#table-of-contents)
- [Installation](#installation)
    - [Adding to Chrome](#adding-to-chrome)
- [Usage](#usage)
- [Development](#development)
    - [Dependencies](#dependencies)
    - [Watch](#watch)
    - [Project tree](#project-tree)
    - [Guidelines](#guidelines)
- [Contribute](#contribute)
    - [Sponsor](#sponsor)
    - [Adding new features or fixing bugs](#adding-new-features-or-fixing-bugs)
- [License](#license)
- [Privacy](#privacy)

# Installation 
[(Back to top)](#table-of-contents)

Clone this repository and navigate inside the project folder and install the dependencies by running:

```
npm i

```

After installing the dependencies, build the project by executing:

```
npm run-script build
```

### Adding to Chrome
[(Back to top)](#table-of-contents)

After you have finished the [Installation](#installation), open Google Chrome and open the Extension Management page by navigating to ```chrome://extensions``` or by opening Settings and clicking Extensions from the bottom left.

Enable Developer Mode by clicking the toggle switch next to Developer mode.

Click the LOAD UNPACKED button and select the extension directory(```.../dist```).

<img src="./demo/images/install_instructions.png" alt="Install Instructions">

Voila! The extension is now installed and ready to be used!

# Usage
[(Back to top)](#table-of-contents)

After adding the extension to Chrome, it will light-up everytime you load a compatable website. 

When a page is loaded, the extension would check for images as you scroll across the page and runs the images through the algorithm and if NSFW images are found, it is replaced automatically by images from Unsplash.

You can toggle(off/on) the extension from the ```chrome://extensions``` page.

# Development 
[(Back to top)](#table-of-contents)

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

### Watch
[(Back to top)](#table-of-contents)

Watch task makes it easier while you are developing the extension. If it detects changes in your source code, it automatically recompiles and reloads the extension.

Run this command after [Installation](#installation):

```
npm run-script watch
```

### Project tree
[(Back to top)](#table-of-contents)

```
├── _config.yml
├── demo
│   └── images
│       ├── banner.png
│       ├── demo.gif
│       ├── download.png
│       ├── icon32.png
│       ├── install_instructions.png
│       └── logo.png
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
├── LICENSE
├── package.json
├── package-lock.json
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

### Sponsor
[(Back to top)](#table-of-contents)

This is a completely Open Source project and it is free for use. A contribution from you would go a long way to lift my spirits up and push me to build more cool stuff in the future.

You can click this link for sponsoring.

### Adding new features or fixing bugs
[(Back to top)](#table-of-contents)

Check out [Development](#development) for setting up your development environment.

Submit a **pull request**, wait for **review**. I will check(usually) every-other-day.

Please follow the [**Code of Conduct**](./CODE_OF_CONDUCT.md).

If you need any clarifications, mail me at: navendupottekkat@gmail.com or ping me in [LinkedIn](https://www.linkedin.com/in/navendup/). I would be happy to sort things out!

# License
[(Back to top)](#table-of-contents)

[GNU General Public License version 3](https://opensource.org/licenses/GPL-3.0)

# Privacy
[(Back to top)](#table-of-contents)

This extension does **NOT** collect and send any user data. All the operations on the images are done locally on the browser.
