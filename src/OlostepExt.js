/* eslint-disable */
var OlostepExt = (function () {
  'use strict';

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn) {
    var module = { exports: {} };
    return fn(module, module.exports), module.exports;
  }

  var browserPolyfill = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
      {
        factory(module);
      }
    })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : commonjsGlobal, function (module) {

      if (typeof browser === "undefined" || Object.getPrototypeOf(browser) !== Object.prototype) {
        const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
        const SEND_RESPONSE_DEPRECATION_WARNING = "Returning a Promise is the preferred way to send a reply from an onMessage/onMessageExternal listener, as the sendResponse will be removed from the specs (See https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)"; // Wrapping the bulk of this polyfill in a one-time-use function is a minor
        // optimization for Firefox. Since Spidermonkey does not fully parse the
        // contents of a function until the first time it's called, and since it will
        // never actually need to be called, this allows the polyfill to be included
        // in Firefox nearly for free.

        const wrapAPIs = extensionAPIs => {
          // NOTE: apiMetadata is associated to the content of the api-metadata.json file
          // at build time by replacing the following "include" with the content of the
          // JSON file.
          const apiMetadata = {
            "alarms": {
              "clear": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "clearAll": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "get": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "getAll": {
                "minArgs": 0,
                "maxArgs": 0
              }
            },
            "bookmarks": {
              "create": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "get": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getChildren": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getRecent": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getSubTree": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getTree": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "move": {
                "minArgs": 2,
                "maxArgs": 2
              },
              "remove": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeTree": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "search": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "update": {
                "minArgs": 2,
                "maxArgs": 2
              }
            },
            "browserAction": {
              "disable": {
                "minArgs": 0,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "enable": {
                "minArgs": 0,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "getBadgeBackgroundColor": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getBadgeText": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getPopup": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getTitle": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "openPopup": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "setBadgeBackgroundColor": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "setBadgeText": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "setIcon": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "setPopup": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "setTitle": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              }
            },
            "browsingData": {
              "remove": {
                "minArgs": 2,
                "maxArgs": 2
              },
              "removeCache": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeCookies": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeDownloads": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeFormData": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeHistory": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeLocalStorage": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removePasswords": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removePluginData": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "settings": {
                "minArgs": 0,
                "maxArgs": 0
              }
            },
            "commands": {
              "getAll": {
                "minArgs": 0,
                "maxArgs": 0
              }
            },
            "contextMenus": {
              "remove": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeAll": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "update": {
                "minArgs": 2,
                "maxArgs": 2
              }
            },
            "cookies": {
              "get": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getAll": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getAllCookieStores": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "remove": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "set": {
                "minArgs": 1,
                "maxArgs": 1
              }
            },
            "devtools": {
              "inspectedWindow": {
                "eval": {
                  "minArgs": 1,
                  "maxArgs": 2,
                  "singleCallbackArg": false
                }
              },
              "panels": {
                "create": {
                  "minArgs": 3,
                  "maxArgs": 3,
                  "singleCallbackArg": true
                },
                "elements": {
                  "createSidebarPane": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                }
              }
            },
            "downloads": {
              "cancel": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "download": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "erase": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getFileIcon": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "open": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "pause": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeFile": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "resume": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "search": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "show": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              }
            },
            "extension": {
              "isAllowedFileSchemeAccess": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "isAllowedIncognitoAccess": {
                "minArgs": 0,
                "maxArgs": 0
              }
            },
            "history": {
              "addUrl": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "deleteAll": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "deleteRange": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "deleteUrl": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getVisits": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "search": {
                "minArgs": 1,
                "maxArgs": 1
              }
            },
            "i18n": {
              "detectLanguage": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getAcceptLanguages": {
                "minArgs": 0,
                "maxArgs": 0
              }
            },
            "identity": {
              "launchWebAuthFlow": {
                "minArgs": 1,
                "maxArgs": 1
              }
            },
            "idle": {
              "queryState": {
                "minArgs": 1,
                "maxArgs": 1
              }
            },
            "management": {
              "get": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getAll": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "getSelf": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "setEnabled": {
                "minArgs": 2,
                "maxArgs": 2
              },
              "uninstallSelf": {
                "minArgs": 0,
                "maxArgs": 1
              }
            },
            "notifications": {
              "clear": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "create": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "getAll": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "getPermissionLevel": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "update": {
                "minArgs": 2,
                "maxArgs": 2
              }
            },
            "pageAction": {
              "getPopup": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getTitle": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "hide": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "setIcon": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "setPopup": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "setTitle": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              },
              "show": {
                "minArgs": 1,
                "maxArgs": 1,
                "fallbackToNoCallback": true
              }
            },
            "permissions": {
              "contains": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getAll": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "remove": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "request": {
                "minArgs": 1,
                "maxArgs": 1
              }
            },
            "runtime": {
              "getBackgroundPage": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "getPlatformInfo": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "openOptionsPage": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "requestUpdateCheck": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "sendMessage": {
                "minArgs": 1,
                "maxArgs": 3
              },
              "sendNativeMessage": {
                "minArgs": 2,
                "maxArgs": 2
              },
              "setUninstallURL": {
                "minArgs": 1,
                "maxArgs": 1
              }
            },
            "sessions": {
              "getDevices": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "getRecentlyClosed": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "restore": {
                "minArgs": 0,
                "maxArgs": 1
              }
            },
            "storage": {
              "local": {
                "clear": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "get": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getBytesInUse": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "set": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "managed": {
                "get": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getBytesInUse": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "sync": {
                "clear": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "get": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getBytesInUse": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "set": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              }
            },
            "tabs": {
              "captureVisibleTab": {
                "minArgs": 0,
                "maxArgs": 2
              },
              "create": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "detectLanguage": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "discard": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "duplicate": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "executeScript": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "get": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getCurrent": {
                "minArgs": 0,
                "maxArgs": 0
              },
              "getZoom": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "getZoomSettings": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "goBack": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "goForward": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "highlight": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "insertCSS": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "move": {
                "minArgs": 2,
                "maxArgs": 2
              },
              "query": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "reload": {
                "minArgs": 0,
                "maxArgs": 2
              },
              "remove": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "removeCSS": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "sendMessage": {
                "minArgs": 2,
                "maxArgs": 3
              },
              "setZoom": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "setZoomSettings": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "update": {
                "minArgs": 1,
                "maxArgs": 2
              }
            },
            "topSites": {
              "get": {
                "minArgs": 0,
                "maxArgs": 0
              }
            },
            "webNavigation": {
              "getAllFrames": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "getFrame": {
                "minArgs": 1,
                "maxArgs": 1
              }
            },
            "webRequest": {
              "handlerBehaviorChanged": {
                "minArgs": 0,
                "maxArgs": 0
              }
            },
            "windows": {
              "create": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "get": {
                "minArgs": 1,
                "maxArgs": 2
              },
              "getAll": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "getCurrent": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "getLastFocused": {
                "minArgs": 0,
                "maxArgs": 1
              },
              "remove": {
                "minArgs": 1,
                "maxArgs": 1
              },
              "update": {
                "minArgs": 2,
                "maxArgs": 2
              }
            }
          };

          if (Object.keys(apiMetadata).length === 0) {
            throw new Error("api-metadata.json has not been included in browser-polyfill");
          }
          /**
           * A WeakMap subclass which creates and stores a value for any key which does
           * not exist when accessed, but behaves exactly as an ordinary WeakMap
           * otherwise.
           *
           * @param {function} createItem
           *        A function which will be called in order to create the value for any
           *        key which does not exist, the first time it is accessed. The
           *        function receives, as its only argument, the key being created.
           */


          class DefaultWeakMap extends WeakMap {
            constructor(createItem, items = undefined) {
              super(items);
              this.createItem = createItem;
            }

            get(key) {
              if (!this.has(key)) {
                this.set(key, this.createItem(key));
              }

              return super.get(key);
            }

          }
          /**
           * Returns true if the given object is an object with a `then` method, and can
           * therefore be assumed to behave as a Promise.
           *
           * @param {*} value The value to test.
           * @returns {boolean} True if the value is thenable.
           */


          const isThenable = value => {
            return value && typeof value === "object" && typeof value.then === "function";
          };
          /**
           * Creates and returns a function which, when called, will resolve or reject
           * the given promise based on how it is called:
           *
           * - If, when called, `chrome.runtime.lastError` contains a non-null object,
           *   the promise is rejected with that value.
           * - If the function is called with exactly one argument, the promise is
           *   resolved to that value.
           * - Otherwise, the promise is resolved to an array containing all of the
           *   function's arguments.
           *
           * @param {object} promise
           *        An object containing the resolution and rejection functions of a
           *        promise.
           * @param {function} promise.resolve
           *        The promise's resolution function.
           * @param {function} promise.rejection
           *        The promise's rejection function.
           * @param {object} metadata
           *        Metadata about the wrapped method which has created the callback.
           * @param {integer} metadata.maxResolvedArgs
           *        The maximum number of arguments which may be passed to the
           *        callback created by the wrapped async function.
           *
           * @returns {function}
           *        The generated callback function.
           */


          const makeCallback = (promise, metadata) => {
            return (...callbackArgs) => {
              if (extensionAPIs.runtime.lastError) {
                promise.reject(extensionAPIs.runtime.lastError);
              } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
                promise.resolve(callbackArgs[0]);
              } else {
                promise.resolve(callbackArgs);
              }
            };
          };

          const pluralizeArguments = numArgs => numArgs == 1 ? "argument" : "arguments";
          /**
           * Creates a wrapper function for a method with the given name and metadata.
           *
           * @param {string} name
           *        The name of the method which is being wrapped.
           * @param {object} metadata
           *        Metadata about the method being wrapped.
           * @param {integer} metadata.minArgs
           *        The minimum number of arguments which must be passed to the
           *        function. If called with fewer than this number of arguments, the
           *        wrapper will raise an exception.
           * @param {integer} metadata.maxArgs
           *        The maximum number of arguments which may be passed to the
           *        function. If called with more than this number of arguments, the
           *        wrapper will raise an exception.
           * @param {integer} metadata.maxResolvedArgs
           *        The maximum number of arguments which may be passed to the
           *        callback created by the wrapped async function.
           *
           * @returns {function(object, ...*)}
           *       The generated wrapper function.
           */


          const wrapAsyncFunction = (name, metadata) => {
            return function asyncFunctionWrapper(target, ...args) {
              if (args.length < metadata.minArgs) {
                throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
              }

              if (args.length > metadata.maxArgs) {
                throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
              }

              return new Promise((resolve, reject) => {
                if (metadata.fallbackToNoCallback) {
                  // This API method has currently no callback on Chrome, but it return a promise on Firefox,
                  // and so the polyfill will try to call it with a callback first, and it will fallback
                  // to not passing the callback if the first call fails.
                  try {
                    target[name](...args, makeCallback({
                      resolve,
                      reject
                    }, metadata));
                  } catch (cbError) {
                    // console.warn(`${name} API method doesn't seem to support the callback parameter, ` + "falling back to call it without a callback: ", cbError);
                    target[name](...args); // Update the API method metadata, so that the next API calls will not try to
                    // use the unsupported callback anymore.

                    metadata.fallbackToNoCallback = false;
                    metadata.noCallback = true;
                    resolve();
                  }
                } else if (metadata.noCallback) {
                  target[name](...args);
                  resolve();
                } else {
                  target[name](...args, makeCallback({
                    resolve,
                    reject
                  }, metadata));
                }
              });
            };
          };
          /**
           * Wraps an existing method of the target object, so that calls to it are
           * intercepted by the given wrapper function. The wrapper function receives,
           * as its first argument, the original `target` object, followed by each of
           * the arguments passed to the original method.
           *
           * @param {object} target
           *        The original target object that the wrapped method belongs to.
           * @param {function} method
           *        The method being wrapped. This is used as the target of the Proxy
           *        object which is created to wrap the method.
           * @param {function} wrapper
           *        The wrapper function which is called in place of a direct invocation
           *        of the wrapped method.
           *
           * @returns {Proxy<function>}
           *        A Proxy object for the given method, which invokes the given wrapper
           *        method in its place.
           */


          const wrapMethod = (target, method, wrapper) => {
            return new Proxy(method, {
              apply(targetMethod, thisObj, args) {
                return wrapper.call(thisObj, target, ...args);
              }

            });
          };

          let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
          /**
           * Wraps an object in a Proxy which intercepts and wraps certain methods
           * based on the given `wrappers` and `metadata` objects.
           *
           * @param {object} target
           *        The target object to wrap.
           *
           * @param {object} [wrappers = {}]
           *        An object tree containing wrapper functions for special cases. Any
           *        function present in this object tree is called in place of the
           *        method in the same location in the `target` object tree. These
           *        wrapper methods are invoked as described in {@see wrapMethod}.
           *
           * @param {object} [metadata = {}]
           *        An object tree containing metadata used to automatically generate
           *        Promise-based wrapper functions for asynchronous. Any function in
           *        the `target` object tree which has a corresponding metadata object
           *        in the same location in the `metadata` tree is replaced with an
           *        automatically-generated wrapper function, as described in
           *        {@see wrapAsyncFunction}
           *
           * @returns {Proxy<object>}
           */

          const wrapObject = (target, wrappers = {}, metadata = {}) => {
            let cache = Object.create(null);
            let handlers = {
              has(proxyTarget, prop) {
                return prop in target || prop in cache;
              },

              get(proxyTarget, prop, receiver) {
                if (prop in cache) {
                  return cache[prop];
                }

                if (!(prop in target)) {
                  return undefined;
                }

                let value = target[prop];

                if (typeof value === "function") {
                  // This is a method on the underlying object. Check if we need to do
                  // any wrapping.
                  if (typeof wrappers[prop] === "function") {
                    // We have a special-case wrapper for this method.
                    value = wrapMethod(target, target[prop], wrappers[prop]);
                  } else if (hasOwnProperty(metadata, prop)) {
                    // This is an async method that we have metadata for. Create a
                    // Promise wrapper for it.
                    let wrapper = wrapAsyncFunction(prop, metadata[prop]);
                    value = wrapMethod(target, target[prop], wrapper);
                  } else {
                    // This is a method that we don't know or care about. Return the
                    // original method, bound to the underlying object.
                    value = value.bind(target);
                  }
                } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
                  // This is an object that we need to do some wrapping for the children
                  // of. Create a sub-object wrapper for it with the appropriate child
                  // metadata.
                  value = wrapObject(value, wrappers[prop], metadata[prop]);
                } else if (hasOwnProperty(metadata, "*")) {
                  // Wrap all properties in * namespace.
                  value = wrapObject(value, wrappers[prop], metadata["*"]);
                } else {
                  // We don't need to do any wrapping for this property,
                  // so just forward all access to the underlying object.
                  Object.defineProperty(cache, prop, {
                    configurable: true,
                    enumerable: true,

                    get() {
                      return target[prop];
                    },

                    set(value) {
                      target[prop] = value;
                    }

                  });
                  return value;
                }

                cache[prop] = value;
                return value;
              },

              set(proxyTarget, prop, value, receiver) {
                if (prop in cache) {
                  cache[prop] = value;
                } else {
                  target[prop] = value;
                }

                return true;
              },

              defineProperty(proxyTarget, prop, desc) {
                return Reflect.defineProperty(cache, prop, desc);
              },

              deleteProperty(proxyTarget, prop) {
                return Reflect.deleteProperty(cache, prop);
              }

            }; // Per contract of the Proxy API, the "get" proxy handler must return the
            // original value of the target if that value is declared read-only and
            // non-configurable. For this reason, we create an object with the
            // prototype set to `target` instead of using `target` directly.
            // Otherwise we cannot return a custom object for APIs that
            // are declared read-only and non-configurable, such as `chrome.devtools`.
            //
            // The proxy handlers themselves will still use the original `target`
            // instead of the `proxyTarget`, so that the methods and properties are
            // dereferenced via the original targets.

            let proxyTarget = Object.create(target);
            return new Proxy(proxyTarget, handlers);
          };
          /**
           * Creates a set of wrapper functions for an event object, which handles
           * wrapping of listener functions that those messages are passed.
           *
           * A single wrapper is created for each listener function, and stored in a
           * map. Subsequent calls to `addListener`, `hasListener`, or `removeListener`
           * retrieve the original wrapper, so that  attempts to remove a
           * previously-added listener work as expected.
           *
           * @param {DefaultWeakMap<function, function>} wrapperMap
           *        A DefaultWeakMap object which will create the appropriate wrapper
           *        for a given listener function when one does not exist, and retrieve
           *        an existing one when it does.
           *
           * @returns {object}
           */


          const wrapEvent = wrapperMap => ({
            addListener(target, listener, ...args) {
              target.addListener(wrapperMap.get(listener), ...args);
            },

            hasListener(target, listener) {
              return target.hasListener(wrapperMap.get(listener));
            },

            removeListener(target, listener) {
              target.removeListener(wrapperMap.get(listener));
            }

          }); // Keep track if the deprecation warning has been logged at least once.


          let loggedSendResponseDeprecationWarning = false;
          const onMessageWrappers = new DefaultWeakMap(listener => {
            if (typeof listener !== "function") {
              return listener;
            }
            /**
             * Wraps a message listener function so that it may send responses based on
             * its return value, rather than by returning a sentinel value and calling a
             * callback. If the listener function returns a Promise, the response is
             * sent when the promise either resolves or rejects.
             *
             * @param {*} message
             *        The message sent by the other end of the channel.
             * @param {object} sender
             *        Details about the sender of the message.
             * @param {function(*)} sendResponse
             *        A callback which, when called with an arbitrary argument, sends
             *        that value as a response.
             * @returns {boolean}
             *        True if the wrapped listener returned a Promise, which will later
             *        yield a response. False otherwise.
             */


            return function onMessage(message, sender, sendResponse) {
              let didCallSendResponse = false;
              let wrappedSendResponse;
              let sendResponsePromise = new Promise(resolve => {
                wrappedSendResponse = function (response) {
                  if (!loggedSendResponseDeprecationWarning) {
                    // console.warn(SEND_RESPONSE_DEPRECATION_WARNING, new Error().stack);
                    loggedSendResponseDeprecationWarning = true;
                  }

                  didCallSendResponse = true;
                  resolve(response);
                };
              });
              let result;

              try {
                result = listener(message, sender, wrappedSendResponse);
              } catch (err) {
                result = Promise.reject(err);
              }

              const isResultThenable = result !== true && isThenable(result); // If the listener didn't returned true or a Promise, or called
              // wrappedSendResponse synchronously, we can exit earlier
              // because there will be no response sent from this listener.

              if (result !== true && !isResultThenable && !didCallSendResponse) {
                return false;
              } // A small helper to send the message if the promise resolves
              // and an error if the promise rejects (a wrapped sendMessage has
              // to translate the message into a resolved promise or a rejected
              // promise).


              const sendPromisedResult = promise => {
                promise.then(msg => {
                  // send the message value.
                  sendResponse(msg);
                }, error => {
                  // Send a JSON representation of the error if the rejected value
                  // is an instance of error, or the object itself otherwise.
                  let message;

                  if (error && (error instanceof Error || typeof error.message === "string")) {
                    message = error.message;
                  } else {
                    message = "An unexpected error occurred";
                  }

                  sendResponse({
                    __mozWebExtensionPolyfillReject__: true,
                    message
                  });
                }).catch(err => {
                  // Print an error on the console if unable to send the response.
                  // console.error("Failed to send onMessage rejected reply", err);
                });
              }; // If the listener returned a Promise, send the resolved value as a
              // result, otherwise wait the promise related to the wrappedSendResponse
              // callback to resolve and send it as a response.


              if (isResultThenable) {
                sendPromisedResult(result);
              } else {
                sendPromisedResult(sendResponsePromise);
              } // Let Chrome know that the listener is replying.


              return true;
            };
          });

          const wrappedSendMessageCallback = ({
            reject,
            resolve
          }, reply) => {
            if (extensionAPIs.runtime.lastError) {
              // Detect when none of the listeners replied to the sendMessage call and resolve
              // the promise to undefined as in Firefox.
              // See https://github.com/mozilla/webextension-polyfill/issues/130
              if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
                resolve();
              } else {
                reject(extensionAPIs.runtime.lastError);
              }
            } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
              // Convert back the JSON representation of the error into
              // an Error instance.
              reject(new Error(reply.message));
            } else {
              resolve(reply);
            }
          };

          const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
            if (args.length < metadata.minArgs) {
              throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
            }

            if (args.length > metadata.maxArgs) {
              throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
            }

            return new Promise((resolve, reject) => {
              const wrappedCb = wrappedSendMessageCallback.bind(null, {
                resolve,
                reject
              });
              args.push(wrappedCb);
              apiNamespaceObj.sendMessage(...args);
            });
          };

          const staticWrappers = {
            runtime: {
              onMessage: wrapEvent(onMessageWrappers),
              onMessageExternal: wrapEvent(onMessageWrappers),
              sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                minArgs: 1,
                maxArgs: 3
              })
            },
            tabs: {
              sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                minArgs: 2,
                maxArgs: 3
              })
            }
          };
          const settingMetadata = {
            clear: {
              minArgs: 1,
              maxArgs: 1
            },
            get: {
              minArgs: 1,
              maxArgs: 1
            },
            set: {
              minArgs: 1,
              maxArgs: 1
            }
          };
          apiMetadata.privacy = {
            network: {
              "*": settingMetadata
            },
            services: {
              "*": settingMetadata
            },
            websites: {
              "*": settingMetadata
            }
          };
          return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
        };

        // @TODO: Refactor

        if (typeof chrome != "object" || !chrome || !chrome.runtime || !chrome.runtime.id) {
          if (document && document.currentScript && document.currentScript.getAttribute("source-to-retrieve")) {
            let script_src = document.currentScript.getAttribute("source-to-retrieve");
            let type = document.currentScript.getAttribute("type-to-retrieve");
            let fallback_url = document.currentScript.getAttribute("fallback-url");
            let allowed_scripts = [
              "https://www.paypal.com/sdk/js?client-id=AYjrmf0lUoTfWbaKhvpg3ty4EnWIg6ECP94KiApquMvJ57bvaLCbQ8jClSLQRmpgFvYtJGi6dvv8EGCH&merchant-id=",
              "https://js.stripe.com/v3/",
              "https://unpkg.com/@power-elements/stripe-elements?module"
            ]
            if(!allowed_scripts.some((x) => script_src.startsWith(x))) throw new Error("Olostep: source-to-retrieve is not allowed. The allowed scripts are: " + allowed_scripts.join(", "));
            // https://stackoverflow.com/a/61901020/18290336 -> fallback URL if script fails to load due to CSP restrictions
            document.addEventListener("securitypolicyviolation", (e) => {
              // https://developer.mozilla.org/en-US/docs/Web/API/Element/securitypolicyviolation_event
              let blockedURI = e.blockedURI;
              if(blockedURI === script_src){
                if(fallback_url !== "https://www.olostep.com"){
                  // set a flag so we don't show the tip request
                  var input = document.createElement("input");
                  input.type = "hidden";
                  input.id = "olostep-tip-request-v2-failed-to-load-script";
                  input.value = "true";
                  document.body.appendChild(input);
                  window.open(fallback_url, "_blank")
                }
              }
            });

            let script = document.createElement('script');
            script.src = script_src;
            script.type = type;
            document.head.appendChild(script);
          } else if(document && document.currentScript && document.currentScript.getAttribute("action-olostep")){
            let action = document.currentScript.getAttribute("action-olostep");
            let amount_to_tip = parseInt(document.currentScript.getAttribute("amount-to-tip"));
            let currency = document.currentScript.getAttribute("currency");
            let stripe_account = document.currentScript.getAttribute("stripe-account");
            if(action === "createToken") {
              async function consumeToken(tokenID, amount_to_tip, currency, stripe_account){
                return new Promise(async function (res) {
                  try{
                    let timedOut = true;
                    setTimeout(
                      function(){
                        if(timedOut){ res({ "errorDonation": true }) }
                      }, 8500)
                    fetch(`https://2oshxbahutz4w3fj3igcjpr3bu0orowr.lambda-url.us-east-1.on.aws/?token=${tokenID}&amountToDonate=${amount_to_tip.toString()}&currency=${currency}&stripeAccount=${stripe_account}`  /*+ '&testingBool=true'*/) // TODO:CRITICAL remove testingBool
                      .then(response => response.json())
                      .then(data => {
                        timedOut = false;
                        res(data)
                      })
                      .catch((error) => {
                        timedOut = false;
                        res({
                          "errorDonation": true
                        })
                      })
                  } catch (e) {
                    res({
                      "errorDonation": true
                    })
                  }
                })
              }
              function postMessage(message_object) {
                window.postMessage({
                  "olostep_tip_request_v2_createToken_result": message_object
                }, window.location.origin);
              }
              let olostep_tip_request_v2 = document.querySelector("#olostep-tip-request-v2");
              if (olostep_tip_request_v2 && olostep_tip_request_v2.shadowRoot && olostep_tip_request_v2.shadowRoot.querySelector("#id-reference-elements")) {
                let stripe_elements = olostep_tip_request_v2.shadowRoot.querySelector("#id-reference-elements");
                stripe_elements.createToken().then(
                  (result) => {
                    if(result.error) {
                      postMessage({ "success": false, "error": result.error })
                    } else {
                      let tokenID = result.token.id;
                      // todo: make this more secure by just passing an ID and fetching
                      // all the other details from the server
                      consumeToken(tokenID, amount_to_tip, currency, stripe_account).then(function (donationResponse) {
                        postMessage({ "success": true, "donationResponse": donationResponse })
                      })
                    }
                  })
                  .catch((err) => {
                    postMessage({ "success": false, "error": err })
                  })
              }
            }
            else if(action === "createPayPal"){
              function postMessage(message_object) {
                window.postMessage({
                  "olostep_tip_request_v2_createPayPal_result": message_object
                }, window.location.origin);
              }
              function doesElementExist(element) {
                return typeof element !== 'undefined' && element !== null;
              }
              function generateRandomId(length){
                let result = '';
                let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let charactersLength = characters.length;
                for(let i = 0; i < length; i++){
                  result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
              }
              function payPalPurchaseUnits(value, currencyCode){
                let randomID = "olostep-tip-extensions-" + generateRandomId(6)
                let description = "Tip received through Olostep library"
                return [
                  {
                    "amount": {
                      "currency_code": currencyCode,
                      "value": value,
                      "breakdown": {
                        "item_total": {
                          "currency_code": currencyCode,
                          "value": value
                        }
                      }
                    },
                    "items": [
                      {
                        "name": description,
                        "description": description, /* Item details will also be in the completed paypal.com transaction view */
                        "unit_amount": {
                          "currency_code": currencyCode,
                          "value": value
                        },
                        "quantity": 1
                      },
                    ],
                    "invoice_id": randomID,
                    "custom_id":  randomID
                  }
                ]
              }

              function handlePaypalElement(dcmnt, amountPayPal, currency){
                let allPaypalIframes = dcmnt.querySelectorAll('[id^="paypal-iframe-biglietto"]')
                for(let i=0; i<allPaypalIframes.length; i++){
                  allPaypalIframes[i].remove()
                }
                if(doesElementExist(dcmnt.getElementById("smart-button-container"))) dcmnt.getElementById("smart-button-container").remove();

                let smartButtonContainer = document.createElement("div");
                smartButtonContainer.style.textAlign = "center";
                smartButtonContainer.style.width = "70%";
                smartButtonContainer.id = "smart-button-container";

                dcmnt.getElementById("attach-yourself-here").style.maxHeight = "30px";
                dcmnt.getElementById("attach-yourself-here").style.paddingTop = "15px";
                dcmnt.getElementById("attach-yourself-here").style.paddingBottom = "10px";
                dcmnt.getElementById("attach-yourself-here").prepend(smartButtonContainer);

                let iframe = document.createElement('div');
                let idToAssign = "paypal-iframe-biglietto" + amountPayPal.toString();
                iframe.id = idToAssign
                dcmnt.getElementById('smart-button-container').appendChild(iframe);

                let styleObject = {
                  shape: 'rect',
                  color: 'gold',
                  layout: 'horizontal',
                  label: 'paypal',
                  tagline: false
                }

                paypal.Buttons({
                  style: styleObject,
                  createOrder: function (data, actions) {
                    return actions.order.create({
                      headers: {
                        "PayPal-Partner-Attribution-Id": "ZECENTO_SP_PPCP"
                      },
                      purchase_units: payPalPurchaseUnits(amountPayPal, currency.toUpperCase()),
                    });
                  },
                  onApprove: function (data, actions) {
                    return actions.order.capture().then(function (orderData) {
                      orderData["errorDonation"] = false
                      postMessage(orderData)
                    });
                  },
                  onError: function (err) {
                    let errorDonation = {
                      "errorDonation": true
                    }
                    // disabled for now because sometimes the PayPal SDK
                    // returns an error even if the payment is just cancelled
                    // TODO:Look into the different error codes and see if we can
                    // distinguish between a cancelled payment and a real error
                    // postMessage(errorDonation)
                  }
                }).render(document.querySelector("#olostep-tip-request-v2").shadowRoot.querySelector('#' + idToAssign));
              }
              let dcmnt = document.querySelector("#olostep-tip-request-v2").shadowRoot
              if(doesElementExist(dcmnt)){
                handlePaypalElement(dcmnt, amount_to_tip, currency)
              }
            }
          }
          else {
            throw new Error("This script should only be loaded in a browser extension.");
          }
        } // The build process adds a UMD wrapper around this file, which makes the
        // `module` variable available.


        module.exports = wrapAPIs(chrome);
      } else {
        module.exports = browser;
      }
    });

  });

  // Sign up at https://www.olostep.com/ to use this library.

  function OlostepExt(configuration_key) {

    const CONFIGURATION_KEY = configuration_key;
    const HOST = `https://2yazvjq64ckrleisoh4mfapkia0upjnl.lambda-url.us-east-1.on.aws`;

    function timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function get(key) {
      try {
        return await browserPolyfill.storage.sync.get(key)
      } catch(e) {
        // if sync not available (like with Firefox temp addons), fall back to local
        return await browserPolyfill.storage.local.get(key)
      }
    }
    async function set(dict) {
      try {
        return await browserPolyfill.storage.sync.set(dict)
      } catch(e) {
        // if sync not available (like with Firefox temp addons), fall back to local
        return await browserPolyfill.storage.local.set(dict)
      }
    }

    // ----- start configuration checks
    browserPolyfill.management && browserPolyfill.management.getSelf().then(async (ext_info) => {
      if (!ext_info.permissions.includes('storage')) {
        var permissions = ext_info.hostPermissions.concat(ext_info.permissions);
        throw `Olostep Setup Error: please include the "storage" permission in manifest.json["permissions"] or else Olostep won't work correctly.

You can copy and paste this to your manifest.json file to fix this error:

"permissions": [
    ${permissions.map(x => `"    ${x}"`).join(',\n')}${permissions.length > 0 ? ',' : ''}
    "storage"
]
`
      }
    });
    // ----- end configuration checks

    // run on "install"
    get(['olostep_ext_installed_at']).then(async (storage) => {
      if (storage.olostep_ext_installed_at) return;
      const date = new Date().toISOString();
      await set({'olostep_ext_installed_at': date});
    });

    /** OLOSTEP TIP INTEGRATION v.0.0.1 */

    function injectScriptHelper(fallback_url = null, src, type = "text/javascript"){
      return new Promise((resolve) => {
        let script = document.createElement('script');
        script.setAttribute("source-to-retrieve", src)
        script.setAttribute("type-to-retrieve", type)
        let fallback_url_string = (!fallback_url)
          ? "https://www.olostep.com"
          : fallback_url
        script.setAttribute("fallback-url", fallback_url_string)
        script.src = browserPolyfill.runtime.getURL("/OlostepExt.js");
        script.type = "text/javascript";
        script.onload = function () {
          this.remove();
        };
        (document.head || document.documentElement).appendChild(script);
        resolve(true)
      });
    }

    function injectPayPalScript(shouldInject = false, merchantID, fallback_url = null){
      return new Promise((resolve) => {
        if(!shouldInject) {
          resolve(true)
        } else {
          // Multiparty-Olostep (PayPal approved integration - live)
          let clientID = "AYjrmf0lUoTfWbaKhvpg3ty4EnWIg6ECP94KiApquMvJ57bvaLCbQ8jClSLQRmpgFvYtJGi6dvv8EGCH"
          let script_src = `https://www.paypal.com/sdk/js?client-id=${clientID}&merchant-id=${merchantID}`
          injectScriptHelper(fallback_url, script_src).then(
            () => {
              resolve(true)
            }
          )
        }
      });
    }

    function injectStripeScript(shouldInject = false){
      return new Promise((resolve) => {
        if(!shouldInject) {
          resolve(true)
        } else {
          injectScriptHelper(null, "https://js.stripe.com/v3/").then(
            () => {
              injectScriptHelper(null, "https://unpkg.com/@power-elements/stripe-elements?module", "module").then(
                () => {
                  resolve(true)
                }
              )
            }
          )
        }
      })
    }

    function areSnoozersValid(snoozersList){
      // for loop and check if the snoozers are still valid
      // they become invalid after 24*14 hours
      let expiry_hours = 24*14 // 14 days
      for(let i=0; i<snoozersList.length; i++){
        let snoozer = snoozersList[i]
        let snoozer_date = snoozer.epoch
        let snoozer_date_obj = new Date(snoozer_date)
        let now = new Date()
        let diff = now - snoozer_date_obj
        let diff_in_hours = diff / (1000 * 60 * 60)
        if(diff_in_hours < expiry_hours) return true
      }
      return false
    }

    function requestTipOlostep({theme, image_sidebar, header_text, body_text, support_text, remind_me_later_text, confirm_text_btn, change_amount_text_btn, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body, item, price_per_item, currency, selectable_quantities, initial_currency, converted_currency_bool, target_currency, converted_amount, conversion_multiplier, suppress_remind_me_later, fallback_url}){
      if(window.innerWidth < 768) return // only if viewport is desktop or tablet
      getPreviousSnoozers().then(
        async function (snoozersList) {
          if (snoozersList.length > 0 && areSnoozersValid(snoozersList)) return; // if there are previous valid snoozers, don't show the tip
          // first check if the user has already tipped once, if so, don't show the tip
          // later, this behaviour will be customizable through the parameters
          let user = await fetch_user()
          let tips = user.tips
          if (tips.length > 0) return; // if the user has already tipped, don't show the tip
          // default config. Will make overridable in future versions

          let storage = await get(['olostep_ext_stripe_id', 'olostep_ext_paypal_id']);
          let is_stripe_available = storage.hasOwnProperty("olostep_ext_stripe_id")
          let is_paypal_available = storage.hasOwnProperty("olostep_ext_paypal_id")
          if (!is_stripe_available && !is_paypal_available) return; // if both are not available, don't show the tip
          injectPayPalScript(is_paypal_available, storage.olostep_ext_paypal_id, fallback_url).then(
            function (paypalScriptInjected) {
              injectStripeScript(is_stripe_available).then(
                function (stripeScriptInjected) {
                  if (paypalScriptInjected && stripeScriptInjected) {
                    showHtml("olostep-tip-request-v2", "olostep-tip-request-v2", {
                      "is_stripe_available": is_stripe_available,
                      "primary_color": theme.primary_color,
                      "secondary_color": theme.secondary_color,
                      "stripe_id": storage.olostep_ext_stripe_id,
                    }).then(
                      function (htmlHook) {
                        hookUpTippingJar({
                          htmlHook: htmlHook,
                          theme: theme,
                          image_sidebar: image_sidebar,
                          header_text: header_text,
                          body_text: body_text,
                          support_text: support_text,
                          remind_me_later_text: remind_me_later_text,
                          confirm_text_btn: confirm_text_btn,
                          change_amount_text_btn: change_amount_text_btn,
                          thank_you_message_header: thank_you_message_header,
                          thank_you_message_body: thank_you_message_body,
                          transaction_failed_header: transaction_failed_header,
                          transaction_failed_body: transaction_failed_body,
                          item: item,
                          price_per_item: price_per_item,
                          currency: currency,
                          selectable_quantities: selectable_quantities,
                          initial_currency: initial_currency,
                          converted_currency_bool: converted_currency_bool,
                          target_currency: target_currency,
                          converted_amount: converted_amount,
                          conversion_multiplier: conversion_multiplier,
                          is_stripe_available: is_stripe_available,
                          is_paypal_available: is_paypal_available,
                          stripe_id: storage.olostep_ext_stripe_id,
                          suppress_remind_me_later: suppress_remind_me_later
                        })
                      }
                    )
                  }
                })
            }
          )
        })
    }


    function formatCustomInput(document) {
      document.querySelector("#form-custom-amount").onsubmit = function(event){event.preventDefault(); return null}
      const intRx = /\d/,
        integerChange = event => {
          if (
            event.key.length > 1 ||
            event.ctrlKey ||
            (event.key === '-' && !event.currentTarget.value.length) ||
            intRx.test(event.key)
          )
            return;
          event.preventDefault();
        };

      for (let input of document.querySelectorAll('input[type="number"][step="1"]'))
        input.addEventListener('keydown', integerChange);

      function limit(element) {
        var max_chars = 3;
        if (element.value.length > max_chars) {
          element.value = element.value.substr(0, max_chars);
        }
        // delete all "-"
        element.value = element.value.replace(/-/g, '');
      }

      for (let input of document.querySelectorAll(
        'input[type="number"][step="1"]'
      )) {
        input.addEventListener('keyup', function () {
          limit(input);
        });
        input.addEventListener('keydown', function () {
          limit(input);
        });
      }
    }

    function resetSelectedAmounts(htmlHook){
      for(let i=1; i<4; i++){
        htmlHook.querySelector("#change-onhover-theme-" + i.toString()).style.backgroundColor = "transparent"
        htmlHook.querySelector("#change-onhover-theme-" + i.toString()).style.color = "#0F1111"
        htmlHook.querySelector("#change-onhover-theme-" + i.toString()).style.borderColor = "#BCBBC3"
      }
    }

    function checkSelectedAmount(htmlHook, i, primary_color, secondary_color){
      resetSelectedAmounts(htmlHook)
      htmlHook.querySelector("#change-onhover-theme-" + i.toString()).style.backgroundColor = primary_color
      htmlHook.querySelector("#change-onhover-theme-" + i.toString()).style.color = secondary_color
      htmlHook.querySelector("#change-onhover-theme-" + i.toString()).style.borderColor = primary_color
    }

    function hookUpTippingJar({
      htmlHook,
      theme,
      image_sidebar,
      header_text,
      body_text,
      support_text,
      remind_me_later_text,
      confirm_text_btn,
      change_amount_text_btn,
      thank_you_message_header,
      thank_you_message_body,
      transaction_failed_header,
      transaction_failed_body,
      item,
      price_per_item,
      currency,
      selectable_quantities,
      initial_currency,
      converted_currency_bool,
      target_currency,
      converted_amount,
      conversion_multiplier,
      is_stripe_available,
      is_paypal_available,
      stripe_id,
      suppress_remind_me_later
    }){
      // check if this olostep-tip-request-v2-failed-to-load-script is present
      // if it is, don't show the tip request
      let failed_to_load_script = document.querySelector("#olostep-tip-request-v2-failed-to-load-script")
      if(failed_to_load_script && failed_to_load_script.value === "true") {
        hideHtml("olostep-tip-request-v2")
        return
      } // if the script failed to load, don't show the tip request

      setTimeout(() => {
        htmlHook.querySelector("#olostep-tipping-window-v3").style.marginRight = "0%"
      }, 500)

      htmlHook.getElementById("dismiss-notification-olostep").onclick = function(){
        hideHtml("olostep-tip-request-v2")
      }

      if(suppress_remind_me_later){
        htmlHook.querySelector("#remind-me-theguardian-window").style.display = "none"
      }

      htmlHook.querySelector("#remind-me-theguardian-window").onclick = async function(){
        let snoozer = {
          "epoch": new Date().toISOString(),
          "reason": "remind-me-theguardian-window",
          "expiry": new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          "url": window.location.href,
          "version": "0.0.1",
          "user_id": await fetch_user().id
        }
        addSnoozer(snoozer).then()
        hideHtml("olostep-tip-request-v2")
      }

      if(!is_stripe_available){
        htmlHook.querySelector("#id-reference-elements").style.display = "none"
        htmlHook.querySelector("#or-payment-option").style.display = "none"
      }
      if(!is_paypal_available){
        htmlHook.querySelector("#attach-yourself-here").style.display = "none"
        htmlHook.querySelector("#or-payment-option").style.display = "none"
      }
      htmlHook.querySelector("#change-amount-grey-txt").textContent = change_amount_text_btn

      htmlHook.querySelector("#button-donate-amount").style.backgroundColor = theme.primary_color
      htmlHook.querySelector("#cta-i18n").textContent = support_text
      htmlHook.querySelector("#cta-text-main").textContent = header_text
      htmlHook.querySelector("#body-request-txt").textContent = body_text
      htmlHook.querySelector("#remind-me-theguardian-window").textContent = remind_me_later_text

      let is_there_image_sidebar = image_sidebar !== "" && image_sidebar !== undefined

      if(is_there_image_sidebar) {
        htmlHook.querySelector("#image-selected-big").src = image_sidebar
        htmlHook.querySelector("#image-selected-big").srcset = image_sidebar
      } else {
        htmlHook.querySelector("#image-wrapper-sidebar").style.display = "none"
        htmlHook.querySelector("#cta-text-main").style.maxWidth = "100%"
        htmlHook.querySelector("#body-request-txt").style.maxWidth = "100%"
      }
      if(item === "heart"){
        htmlHook.querySelector("#tip-emoji-olostep").style.display = "none"
        htmlHook.querySelector("#heart-click-blue-img").style.display = "block"
      } else {
        htmlHook.querySelector("#heart-click-blue-img").style.display = "none"
        htmlHook.querySelector("#tip-emoji-olostep").style.display = "block"
        htmlHook.querySelector("#tip-emoji-olostep").textContent = olostep_map_items_emoji[item]
      }

      // todo: later versions, fix this boilerplate. Create a function.
      // maybe a macro that takes the htmlHook and the amount and creates the rest

      let multiplier_first_amount = selectable_quantities[0] // 2
      let multiplier_second_amount = selectable_quantities[1] // 5
      let multiplier_third_amount = selectable_quantities[2] // 10

      let price_int_per_item = (parseInt(price_per_item) / 100) // 6, 7, 8

      initial_currency = initial_currency.toUpperCase()
      let price_display_original_curr = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(price_int_per_item * multiplier_first_amount)
      if(converted_currency_bool) {
        htmlHook.querySelector("#original-amount-currency").textContent = "( " + price_display_original_curr + " )"
        htmlHook.querySelector("#original-amount-currency").style.display = "inline-block"
        htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: target_currency }).format(parseFloat(converted_amount) * multiplier_first_amount)
      } else {
        htmlHook.querySelector("#amount-dynamic-txt").textContent = price_display_original_curr
        htmlHook.querySelector("#original-amount-currency").style.display = "none"
      }


      for(let i=1; i<4; i++){ // 1, 2, 3
        htmlHook.querySelector("#amount-picked-" + i.toString()).textContent = selectable_quantities[i-1].toString()
      }

      let amount_tip_fintech = price_per_item * multiplier_first_amount // to be sent to STRIPE or PAYPAL
      let amount_tip_display = price_int_per_item * multiplier_first_amount
      injectPayPalBTN(amount_tip_fintech, currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
      checkSelectedAmount(htmlHook, 1, theme.primary_color, theme.secondary_color)
      htmlHook.querySelector("#amount-first").onclick = function(){
        checkSelectedAmount(htmlHook, 1, theme.primary_color, theme.secondary_color)
        amount_tip_fintech = price_per_item * multiplier_first_amount
        amount_tip_display = price_int_per_item * multiplier_first_amount

        if(converted_currency_bool) { // it was converted!
          htmlHook.querySelector("#original-amount-currency").textContent = "( " + new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display) + " )"
          htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: target_currency }).format(parseFloat(converted_amount) * multiplier_first_amount)
        } else {
          htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display)
        }
        htmlHook.getElementById("button-donate-amount").onclick = function(){
          showPaymentOptions(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
        }
        injectPayPalBTN(amount_tip_fintech, currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
      }

      htmlHook.querySelector("#amount-second").onclick = function(){
        checkSelectedAmount(htmlHook, 2, theme.primary_color, theme.secondary_color)
        amount_tip_fintech = price_per_item * multiplier_second_amount
        amount_tip_display = price_int_per_item * multiplier_second_amount

        if(converted_currency_bool) { // it was converted!
          htmlHook.querySelector("#original-amount-currency").textContent = "( " + new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display) + " )"
          htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: target_currency }).format(parseFloat(converted_amount) * multiplier_second_amount)
        } else {
          htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display)
        }
        htmlHook.getElementById("button-donate-amount").onclick = function(){
          showPaymentOptions(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
        }
        injectPayPalBTN(amount_tip_fintech, currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
      }

      htmlHook.querySelector("#amount-third").onclick = function(){
        checkSelectedAmount(htmlHook, 3, theme.primary_color, theme.secondary_color)
        amount_tip_fintech = price_per_item * multiplier_third_amount
        amount_tip_display = price_int_per_item * multiplier_third_amount

        if(converted_currency_bool) { // it was converted!
          htmlHook.querySelector("#original-amount-currency").textContent = "( " + new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display) + " )"
          htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: target_currency }).format(parseFloat(converted_amount) * multiplier_third_amount)
        } else {
          htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display)
        }
        htmlHook.getElementById("button-donate-amount").onclick = function(){
          showPaymentOptions(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
        }
        injectPayPalBTN(amount_tip_fintech, currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
      }

      formatCustomInput(htmlHook)
      let inputElem = htmlHook.querySelector('#custom-amount-tip-field');

      inputElem.addEventListener('input', async () => {
        let amount = inputElem.value;
        if (amount !== '') {
          if (parseFloat(amount) < 1) {
            htmlHook.querySelector("#amount-first").click();
          } else if (parseFloat(amount) > 999) {
            htmlHook.querySelector("#amount-third").click();
          } else {
            if (amount === selectable_quantities[0].toString()) {
              htmlHook.querySelector("#amount-first").click();
            } else if (amount === selectable_quantities[1].toString()) {
              htmlHook.querySelector("#amount-second").click();
            } else if (amount === selectable_quantities[2].toString()) {
              htmlHook.querySelector("#amount-third").click();
            } else {
              resetSelectedAmounts(htmlHook)
              amount_tip_fintech = price_per_item * amount
              amount_tip_display = price_int_per_item * amount
              if(converted_currency_bool) { // it was converted!
                htmlHook.querySelector("#original-amount-currency").textContent = "( " + new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display) + " )"
                htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: target_currency }).format(parseFloat(converted_amount) * amount)
              } else {
                htmlHook.querySelector("#amount-dynamic-txt").textContent = new Intl.NumberFormat(navigator.language, { style: 'currency', currency: initial_currency }).format(amount_tip_display)
              }
              htmlHook.getElementById("button-donate-amount").onclick = function(){
                showPaymentOptions(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
              }
              injectPayPalBTN(amount_tip_fintech, currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
            }
          }
        } else {
          htmlHook.querySelector("#amount-first").click();
        }
      });

      htmlHook.getElementById("button-donate-amount").onclick = function(){
        showPaymentOptions(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
      }
    }

    function reset_html_back(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body){
      /** RESTORE html */
      htmlHook.getElementById("cta-i18n").textContent = support_text
      htmlHook.getElementById("error-c-card").style.display = "none"
      htmlHook.getElementById("cta-text-main").style.display = "block"
      htmlHook.getElementById("back-change-amount").style.display = "none"
      htmlHook.getElementById("1-click-not-enabled").style.display = "block"
      htmlHook.getElementById("select-payment-method").style.display = "none"
      htmlHook.getElementById("dismiss-notification-olostep").style.display = "block"
      htmlHook.getElementById("dismiss-notification-olostep").onclick = function(){
        hideHtml("olostep-tip-request-v2")
      }
      htmlHook.getElementById("button-donate-amount").onclick = function(){
        showPaymentOptions(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
      }
      if(is_there_image_sidebar) {
        htmlHook.getElementById("image-wrapper-sidebar").style.display = "flex"
        htmlHook.getElementById("cta-text-main").style.maxWidth = "310px"
        htmlHook.getElementById("body-request-txt").style.maxWidth = "315px"
      } else {
        htmlHook.getElementById("image-wrapper-sidebar").style.display = "none"
        htmlHook.getElementById("cta-text-main").style.maxWidth = "100%"
        htmlHook.getElementById("body-request-txt").style.maxWidth = "100%"
      }
      htmlHook.getElementById("remind-me-theguardian-window").style.display = "block"
      /** restore html */
    }


    function showPaymentOptions(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body){
      htmlHook.getElementById("cta-i18n").textContent = confirm_text_btn
      htmlHook.getElementById("remind-me-theguardian-window").style.display = "none"
      htmlHook.getElementById("image-wrapper-sidebar").style.display = "none"
      htmlHook.getElementById("cta-text-main").style.display = "none"
      htmlHook.getElementById("back-change-amount").style.display = "flex"
      htmlHook.getElementById("back-change-amount").onclick = function(){
        reset_html_back(htmlHook, amount_tip_fintech, is_there_image_sidebar, confirm_text_btn, support_text, stripe_id, initial_currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
      }
      htmlHook.getElementById("back-change-amount").onmouseover = function(){
        htmlHook.getElementById("copy-response").style.backgroundColor = "#ececf1"
      }
      htmlHook.getElementById("back-change-amount").onmouseout = function(){
        htmlHook.getElementById("copy-response").style.backgroundColor = "#fff"
      }
      htmlHook.getElementById("1-click-not-enabled").style.display = "none"
      htmlHook.getElementById("select-payment-method").style.display = "block"
      htmlHook.getElementById("dismiss-notification-olostep").style.display = "none"
      let isDonating = false;
      htmlHook.getElementById("button-donate-amount").onclick = function(){
        if(!isDonating) {
          isDonating = true;
          htmlHook.getElementById("error-c-card").style.display = "none"
          htmlHook.querySelector("#text-donation-secure").style.display = "none"
          htmlHook.querySelector("#loader-donation-transit").style.display = "block"

          window.addEventListener("message", function(event) {
            if(event.origin !== window.location.origin) return;
            if(event.data.hasOwnProperty("olostep_tip_request_v2_createToken_result")) {
              if (event.data.olostep_tip_request_v2_createToken_result.success) {
                isDonating = false;
                let donationResponse = event.data.olostep_tip_request_v2_createToken_result.donationResponse
                hideHtml("olostep-tip-request-v2")
                showDonationResult(donationResponse, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
              } else {
                isDonating = false;
                htmlHook.getElementById("error-c-card").style.display = "block"
                htmlHook.querySelector("#text-donation-secure").style.display = "block"
                htmlHook.querySelector("#loader-donation-transit").style.display = "none"
                htmlHook.getElementById("error-c-card").textContent = event.data.olostep_tip_request_v2_createToken_result.error.message
              }
            }
          })

          let script_createToken = document.createElement('script');
          script_createToken.setAttribute("action-olostep", "createToken")
          script_createToken.setAttribute("amount-to-tip", amount_tip_fintech.toString())
          script_createToken.setAttribute("currency", initial_currency)
          script_createToken.setAttribute("stripe-account", stripe_id)
          script_createToken.src = browserPolyfill.runtime.getURL("/OlostepExt.js");
          script_createToken.type = "text/javascript";
          script_createToken.onload = function () {
            this.remove();
          }
          document.head.appendChild(script_createToken);
        }
      }
    }

    function createTip(donationDetails){
      return {
        "id": "tip_" + new Date().getTime().toString(),
        "date": new Date().toISOString().slice(0, 10),
        "epoch": new Date().getTime(),
        "url": window.location.href,
        "tip_details": JSON.stringify(donationDetails),
      }
    }


    function showDonationResult(donationResponse, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body){
      showHtml('olostep-tip-result-modal-v2', 'olostep-tip-result-modal-v2').then(
        async function (htmlHook) {
          htmlHook.querySelector("#dismiss-notification-donation").onclick = function () {
            hideHtml('olostep-tip-result-modal-v2')
          }
          if (donationResponse.hasOwnProperty('errorDonation')) {
            if (!donationResponse.errorDonation) {
              htmlHook.querySelector("#change-text-STATUS").textContent = thank_you_message_header
              htmlHook.querySelector("#success-text-expl").style.display = "block"
              htmlHook.querySelector("#success-text-expl").textContent = thank_you_message_body
              htmlHook.querySelector("#issue-explanation").style.display = "none"
              htmlHook.querySelector("#success-icon").style.display = "block"
              htmlHook.querySelector("#issue-icon").style.display = "none"
              // add the tip to the user
              let tip = createTip(donationResponse)
              let user = await fetch_user()
              let previous_tips = user.tips
              previous_tips.push(tip)
              user.tips = previous_tips
              await update_user(user)
            } else {
              htmlHook.querySelector("#change-text-STATUS").textContent = transaction_failed_header
              htmlHook.querySelector("#success-text-expl").style.display = "none"
              htmlHook.querySelector("#issue-explanation").style.display = "block"
              htmlHook.querySelector("#why-issue").textContent = transaction_failed_body
              htmlHook.querySelector("#success-icon").style.display = "none"
              htmlHook.querySelector("#issue-icon").style.display = "flex"
            }
          } else {
            htmlHook.querySelector("#change-text-STATUS").textContent = transaction_failed_header
            htmlHook.querySelector("#success-text-expl").style.display = "none"
            htmlHook.querySelector("#issue-explanation").style.display = "block"
            htmlHook.querySelector("#why-issue").textContent = transaction_failed_body
            htmlHook.querySelector("#success-icon").style.display = "none"
            htmlHook.querySelector("#issue-icon").style.display = "flex"
            htmlHook.querySelector("#alert-donation-result").style.height = "150px"
            htmlHook.querySelector("#alert-donation-result").style.maxHeight = "150px"
          }
        }
      )
    }

    function getPreviousSnoozers() {
      return new Promise(async (resolve) => {
        let storage = await get(['olostep_ext_snoozers']);
        let prevSnoozers = storage.olostep_ext_snoozers;
        if(prevSnoozers === undefined) prevSnoozers = "[]"
        resolve(JSON.parse(prevSnoozers))
      })
    }

    function addSnoozer(snoozer){
      return new Promise(async (resolve) => {
        getPreviousSnoozers().then(
          function (snoozersList) {
            snoozersList.push(snoozer)
            set({'olostep_ext_snoozers': JSON.stringify(snoozersList)}).then(
              function () {
                resolve(true)
              })
          })
      })
    }

    function injectPayPalBTN(amount_to_tip, currency, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body){
      window.addEventListener("message", function(event) {
        if(event.origin !== window.location.origin) return;
        if(event.data.hasOwnProperty("olostep_tip_request_v2_createPayPal_result")) {
          hideHtml("olostep-tip-request-v2")
          showDonationResult(event.data.olostep_tip_request_v2_createPayPal_result, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body)
        }
      })



      amount_to_tip = amount_to_tip / 100
      let script_paypal = document.createElement('script');
      script_paypal.setAttribute("action-olostep", "createPayPal")
      script_paypal.setAttribute("amount-to-tip", amount_to_tip.toString())
      script_paypal.setAttribute("currency", currency)
      script_paypal.setAttribute("stripe-account", "")
      script_paypal.src = browserPolyfill.runtime.getURL("/OlostepExt.js");
      script_paypal.type = "text/javascript";
      script_paypal.onload = function () {
        this.remove();
      }
      document.head.appendChild(script_paypal);
    }

    function showHtml(id,source,optionalMSG={"msg":""}){
      return new Promise(async function (res) {
        let cssSheetLink = "https://olostep-library.s3.amazonaws.com/olostep_library_style.css"
        let myEle = document.getElementById(id);
        if (typeof (myEle) === 'undefined' || myEle === null) {
          const injectDOM = document.createElement('div');
          injectDOM.id = id
          document.body.insertBefore(injectDOM, document.body.firstChild);
          injectDOM.attachShadow({mode: "open"});
          injectDOM.shadowRoot // the shadow root.
          injectDOM.shadowRoot.host // the element itself.
          fetch(cssSheetLink).then(r => r.text()).then(css => {
            let styleTag = document.createElement('style');
            styleTag.innerHTML = css;
            injectDOM.shadowRoot.appendChild(styleTag);
            fetch("https://hjygbf3ozyhb5fe2wibl6hljv40bwbxx.lambda-url.us-east-1.on.aws/?" + new URLSearchParams(
              {...{"html": source}, ...optionalMSG}
            )).then(ru => ru.text()).then(html => {
              let htmlOfFile = document.createElement('div');
              htmlOfFile.innerHTML = html
              injectDOM.shadowRoot.appendChild(htmlOfFile)
              res(injectDOM.shadowRoot)
            });
          });
        }
      })
    }

    function hideHtml(id){
      let el = document.getElementById(id);
      if(el !== null && el !== undefined) {
        el.remove(); // Removes the div with the given id
      }
    }
    /** OLOSTEP INTEGRATION 2.0 */


    function generate_random_id(length){
      let result = '';
      let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let charactersLength = characters.length;
      for(let i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    }

    async function fetch_user() {
      // TODO: sync with server; api.olostep.com
      var storage = await get(['olostep_ext_user', 'olostep_ext_installed_at']);
      if(storage.olostep_ext_user) return storage.olostep_ext_user;
      var user_data = {
        "id": generate_random_id(12),
        "email": null,
        "tips": [],
        "installed_at": storage.olostep_ext_installed_at ? new Date(storage.olostep_ext_installed_at) : new Date(),
        "metadata": {},
        "synced_server": false
      }
      await set({olostep_ext_user: user_data});
      return user_data;
    }

    async function update_user(user) {
      await set({olostep_ext_user: user});
    }

    async function init_olostep_ext() {
      const resp = await fetch(`${HOST}/?configuration_key=${CONFIGURATION_KEY}`);
      if (!resp.ok) throw resp.status
      const resp_json = await resp.json();
      if (resp_json.item_not_found) throw 'Olostep Setup Error: The configuration key is invalid. Please double check your configuration key or reach out via the dashboard at www.olostep.com'
      if(resp_json.stripe_id && resp_json.stripe_id !== "") await set({olostep_ext_stripe_id: resp_json.stripe_id});
      if(resp_json.paypal_id && resp_json.paypal_id !== "") await set({olostep_ext_paypal_id: resp_json.paypal_id});
    }

    function is_content_script() {
      if (browserPolyfill.windows && browserPolyfill.windows.create) return false;
      else if (browserPolyfill.runtime) return true;
      else throw 'Olostep needs to be run in a browser extension context'
    }


    async function olostep_i18n(initial_currency, amount, initial_language, header_text, body_text, support_text_btn, remind_me_later_text, confirm_text_btn, change_amount_text_btn, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body, navigator_language){
      return new Promise(async (resolve, reject) => {
        const url = 'https://vnysrslpyqoxysu6dsgrdap45q0emgai.lambda-url.us-east-1.on.aws/';

        const queryParams = {
          initial_currency: initial_currency,
          initial_language: initial_language.split('-')[0],
          amount: amount.toString(),
          header_text: header_text,
          body_text: body_text,
          support_text: support_text_btn,
          remind_me_later_text: remind_me_later_text,
          confirm_text: confirm_text_btn,
          change_amount_text: change_amount_text_btn,
          thank_you_message_header: thank_you_message_header,
          thank_you_message_body: thank_you_message_body,
          transaction_failed_header: transaction_failed_header,
          transaction_failed_body: transaction_failed_body,
          target_language: navigator_language.split('-')[0], // language of browser
          // target_currency will be picked based on ip address (in the server)
        };

        const queryString = new URLSearchParams(queryParams).toString();
        const finalUrl = `${url}?${queryString}`;
        try {
          const response = await fetch(finalUrl);
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
    }


    const olostep_supported_currency_codes = [
      "AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "HKD", "HUF", "ILS",
      "JPY", "MYR", "MXN", "TWD", "NZD", "NOK", "PHP", "PLN", "GBP", "SGD",
      "SEK", "CHF", "THB", "USD"
    ]

    const olostep_supported_item_names = [
      "coffee", "heart", "beer", "pizza", "book"
    ]

    const olostep_map_items_emoji = {
      "coffee": "☕ ",
      "heart": "https://imageszecentocopyright.s3.amazonaws.com/heart-svg.svg",
      "beer": "🍺",
      "pizza": "🍕",
      "book": "📖"
    }

    const olostep_supported_item_prices = [
      100, 200, 300, 400, 500, 600, 700, 800, 900,
      1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700,
      1800, 1900, 2000
    ]

    const olostep_supported_themes = [
      {
        "name": "web-blue",
        "primary_color": "#1E78CC",
        "secondary_color": "#EAEFFF"
      },
      {
        "name": "pumpkin-spice",
        "primary_color": "#FF905A",
        "secondary_color": "#FFF3EC"
      },
      {
        "name": "serene-blue",
        "primary_color": "#7390FF",
        "secondary_color": "#F1F3FF"
      },
      {
        "name": "plum-passion",
        "primary_color": "#C674FF",
        "secondary_color": "#FBF6FF"
      },
      {
        "name": "teal-dream",
        "primary_color": "#8CDBBE",
        "secondary_color": "#F7FCFB"
      },
      {
        "name": "cotton-candy",
        "primary_color": "#C674FF",
        "secondary_color": "#FBF6FF"
      }
    ]

    function check_request_validity(storage, item, price_per_item, currency, selectable_quantities, header_text, body_text, thank_you_message, language_text, translation_enabled, image_sidebar, theme_color, counter){
      if(!is_content_script()) throw 'Olostep : the tips.request() function can only be called from a content script'
      if (storage.olostep_ext_stripe_id === undefined && storage.olostep_ext_paypal_id === undefined) {
        throw 'Olostep : neither Stripe nor Paypal is enabled for this extension. Please enable one of them from the Olostep dashboard at www.olostep.com. Make sure you run the init() function before calling tips.request()'
      }
      // check currency
      if (!olostep_supported_currency_codes.includes(currency)) {
        throw 'Olostep : the currency provided is not supported by Olostep. The supported currencies are: ' + olostep_supported_currency_codes.join(', ')
      }
      // check item
      if (!olostep_supported_item_names.includes(item)) {
        throw 'Olostep : the item provided is not supported by Olostep. The supported items are: ' + olostep_supported_item_names.join(', ')
      }
      // check price_per_item
      if (!olostep_supported_item_prices.includes(price_per_item)) {
        throw 'Olostep : the price_per_item provided is not supported by Olostep. The supported prices are: ' + olostep_supported_item_prices.join(', ')
      }
      // check selectable_quantities, it has to be an array of three integers
      if (!Array.isArray(selectable_quantities) || selectable_quantities.length !== 3 || !selectable_quantities.every(x => Number.isInteger(x))) {
        throw 'Olostep : the selectable_quantities provided is not supported by Olostep. It has to be an array of three integers'
      }
      if(header_text === "" || body_text === "" || thank_you_message === ""){
        throw 'Olostep : the header_text and body_text cannot be empty'
      }
      // check theme_color
      if (!olostep_supported_themes.map(x => x.name).includes(theme_color)) {
        if(theme_color.hasOwnProperty("name") && theme_color.name === "custom"){
          if(!theme_color.hasOwnProperty("primary_color") || !theme_color.hasOwnProperty("secondary_color")){
            throw 'Olostep : a custom theme_color has to have primary_color and secondary_color'
          }
        } else {
          throw 'Olostep : the theme_color provided is not supported by Olostep. The supported themes are: ' + olostep_supported_themes.map(x => x.name).join(', ')
        }
      }
      return true;
    }

    return {
      users: {
        get: function() {
          return fetch_user()
        }
      },
      tips: {
        request:
          async function ({
            item = "heart", // it can be : ["coffee", "heart", "beer", "pizza", "book"]
            price_per_item = 500, // 100, 200, ..., 2000
            currency = "USD", // "EUR", "USD", ... only olostep supported
            selectable_quantities = [1, 3, 5], // they have to be three integers
            header_text = "Support this extension",
            body_text = "Developing this extension is all done in my own spare time. If you find it beneficial, please consider supporting me. Thanks!",
            thank_you_message_header = "Thank you for your support!",
            thank_you_message_body = "The donation was processed successfully. Your support is greatly appreciated",
            transaction_failed_header = "Transaction failed",
            transaction_failed_body = "We were unable to process your donation due to an error. You can try again with another payment method",
            support_text_btn = "Support",
            remind_me_later_text = "Not now. Remind me later",
            confirm_text_btn = "Confirm",
            change_amount_text_btn = "Change amount",
            language_text = "en-US",
            translation_enabled = true,
            image_sidebar,
            theme_color = "web-blue", // or custom: primary_color, secondary_color
            counter = false, // {"action_id": "1232", "trigger_on_nth_occurrence": 2}, still in development
            suppress_remind_me_later = false,
            fallback_url = null
          }) {
            currency = currency.toUpperCase();
            let storage = await get(['olostep_ext_stripe_id', 'olostep_ext_paypal_id']);
            let is_valid = check_request_validity(storage, item, price_per_item, currency, selectable_quantities, header_text, body_text, thank_you_message_header, language_text, translation_enabled, image_sidebar, theme_color, counter);
            if(!is_valid) return;
            // TODO: implement COUNTER object (next major version)
            let navigator_language = (!translation_enabled) ? language_text : navigator.language;
            olostep_i18n(currency, price_per_item, language_text, header_text, body_text, support_text_btn, remind_me_later_text, confirm_text_btn, change_amount_text_btn, thank_you_message_header, thank_you_message_body, transaction_failed_header, transaction_failed_body, navigator_language).then(
              function (i18n) {
                if(!theme_color.hasOwnProperty("name")) theme_color = olostep_supported_themes.find(x => x.name === theme_color);
                let converted_currency_bool = false;
                let converted_amount = null;
                let conversion_multiplier = null;
                let target_currency = currency;
                try {
                  if (i18n.success) {
                    if (i18n.translated) {
                      let translated_array = i18n.translated_array;
                      header_text = translated_array[0];
                      body_text = translated_array[1];
                      support_text_btn = translated_array[2];
                      remind_me_later_text = translated_array[3];
                      confirm_text_btn = translated_array[4];
                      change_amount_text_btn = translated_array[5];
                      thank_you_message_header = translated_array[6];
                      thank_you_message_body = translated_array[7];
                      transaction_failed_header = translated_array[8];
                      transaction_failed_body = translated_array[9];
                    }
                    if (i18n.converted_currency) {
                      converted_currency_bool = true;
                      converted_amount = i18n.converted_amount;
                      conversion_multiplier = i18n.conversion_multiplier;
                      target_currency = i18n.target_currency;
                    }
                  }
                } catch (e) { }
                requestTipOlostep({
                  theme: theme_color, // directly pass the object
                  image_sidebar: image_sidebar,
                  header_text: header_text,
                  body_text: body_text,
                  support_text: support_text_btn,
                  remind_me_later_text: remind_me_later_text,
                  confirm_text_btn: confirm_text_btn,
                  change_amount_text_btn: change_amount_text_btn,
                  thank_you_message_header: thank_you_message_header,
                  thank_you_message_body: thank_you_message_body,
                  transaction_failed_header: transaction_failed_header,
                  transaction_failed_body: transaction_failed_body,
                  item: item,
                  price_per_item: price_per_item,
                  currency: currency,
                  selectable_quantities: selectable_quantities,
                  initial_currency: currency,
                  converted_currency_bool: converted_currency_bool,
                  target_currency: target_currency,
                  converted_amount: converted_amount,
                  conversion_multiplier: conversion_multiplier,
                  suppress_remind_me_later: suppress_remind_me_later,
                  fallback_url: fallback_url
                })
              }).catch(
              function (error) {
                // proceed without translation and currency_conversion
                requestTipOlostep({
                  theme: theme_color, // directly pass the object
                  image_sidebar: image_sidebar,
                  header_text: header_text,
                  body_text: body_text,
                  support_text: support_text_btn,
                  remind_me_later_text: remind_me_later_text,
                  confirm_text_btn: confirm_text_btn,
                  change_amount_text_btn: change_amount_text_btn,
                  thank_you_message_header: thank_you_message_header,
                  thank_you_message_body: thank_you_message_body,
                  transaction_failed_header: transaction_failed_header,
                  transaction_failed_body: transaction_failed_body,
                  item: item,
                  price_per_item: price_per_item,
                  currency: currency,
                  selectable_quantities: selectable_quantities,
                  initial_currency: currency,
                  converted_currency_bool: false,
                  target_currency: null,
                  converted_amount: null,
                  conversion_multiplier: null,
                  suppress_remind_me_later: suppress_remind_me_later,
                  fallback_url: fallback_url
                })
              }
            )
          },
        hide: function({tip_id = "*"}) {
          for(let i = 0; i<15; i++) {
            // later version, hide a specific tip by id
            hideHtml("olostep-tip-request-v2")
          }
        }
      },
      init: function() {
        init_olostep_ext().then();
        // if in background script, start listening for messages
        if (browserPolyfill.windows && browserPolyfill.windows.create) { // background script
          browserPolyfill.runtime.onMessage.addListener(function (message, sender, send_response) {
            if (message === 'olostep-extinfo' && browserPolyfill.management) {
              // get this message from content scripts which can't access browser.management
              return browserPolyfill.management.getSelf()
            }
          });
        }
      }
    }
  }

  return OlostepExt;

}());
