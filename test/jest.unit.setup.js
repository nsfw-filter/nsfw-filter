// jsdom does not implement IntersectionObserver, and the filters use one to
// judge media as it approaches the viewport. Report anything observed as on
// screen; a test that needs finer control installs its own stub over this.
class IntersectionObserverStub {
    constructor (callback) {
        this.callback = callback
    }

    observe (element) {
        this.callback([{ target: element, isIntersecting: true }], this)
    }

    unobserve () {}
    disconnect () {}
}

global.IntersectionObserver = IntersectionObserverStub
