import puppeteer from "puppeteer";

/**
 * @typedef {import("puppeteer").Page} Page
 * @typedef {import("puppeteer").Browser} Browser
 * @typedef {import("puppeteer").ElementHandle} ElementHandle
 * @typedef {import("puppeteer").LaunchOptions} LaunchOptions
 * @typedef {import("puppeteer").AwaitablePredicate<any>} AwaitablePredicate
 * @typedef {import("puppeteer").HTTPRequest} HTTPRequest
 * @typedef {import("puppeteer").HTTPResponse} HTTPResponse
 * @typedef {import("puppeteer").EvaluateFunc<any>} EvaluateFunc
 * @typedef {import("puppeteer").FrameWaitForFunctionOptions} FrameWaitForFunctionOptions
 * @typedef {import("puppeteer").KeyboardTypeOptions} KeyboardTypeOptions
 * @typedef {import("puppeteer").WaitTimeoutOptions} WaitTimeoutOptions
 */

/**
 * @typedef {Object} BlockOptions
 * @property {function(any): boolean} requests - Function to handle requests.
 * @property {string[]?} resources - Array of resources to block.
 */

/**
 * @typedef {Object} PuppeOptions
 * @property {LaunchOptions} [launchOptions] - Options passed to the Puppeteer browser.
 * @property {string} [ua] - The page user agent string. Default is a Linux human UA.
 * @property {boolean} [js] - When true, enable JavaScript. When false, disable JavaScript. Default true.
 * @property {number} [timeout] - Global timeout duration in milliseconds.
 * @property {number} [navigationTimeout] - Global navigation timeout duration in milliseconds.
 * @property {boolean} [captureBrowserConsole] - Flag to log browser console logs in Node. Default false.
 * @property {boolean} [trimText=true] - Trim extracted text. Default true.
 * @property {BlockOptions} [block] - List of resources to block. Default allow all requests.
 */

/**
 *
 */
class Puppe {
  /** @type {Page | null} */
  #page;

  constructor() {
    this.#page = null;

    /* @type {PuppeOptions} */
    this.opts = {};
  }

  /**
   * Launches a Puppe instance, which includes a Puppeteer browser and page.
   *
   * @param {PuppeOptions?} opts - The options for configuring a Puppe instance.
   * @returns {Promise<Puppe>} A promise that resolves when the Puppe instance is ready.
   */
  async launch(opts) {
    const ua =
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.3";
    /* @type {PuppeOptions} */
    const defaults = Object.freeze({
      launchOptions: {},
      ua,
      js: true,
      timeout: 15_000,
      navigationTimeout: 15_000,
      captureBrowserConsole: false,
      trimText: true,
      block: {
        requests:
          /** @param {HTTPRequest} req */
          req => false,
        resources: [],
      },
      // TODO allow: (overrides block)
      // addScript?
    });

    this.opts = {...defaults, ...opts};
    opts = this.opts;

    /* @type {Browser} */
    this.browser = await puppeteer.launch(
      opts.launchOptions ?? defaults.launchOptions
    );

    const [page] = await this.browser.pages();
    this.#page = page;

    await page.setUserAgent(opts.ua ?? defaults.ua);
    await page.setJavaScriptEnabled(opts.js ?? defaults.js);
    await page.setDefaultNavigationTimeout(
      opts.navigationTimeout ?? defaults.navigationTimeout
    );
    await page.setDefaultTimeout(
      opts.timeout ?? defaults.timeout
    );

    if (opts.captureBrowserConsole) {
      /**
       *
       * @param {?} msg
       */
      const onPageConsole = msg =>
        Promise.all(
          msg
            .args()
            .map(
              /** @param {ElementHandle} e */ e => e.jsonValue()
            )
        ).then(args => console.log(...args));
      page.on("console", onPageConsole);
    }

    if (opts.block?.requests || !opts.block?.resources?.length) {
      await page.setRequestInterception(true);
      page.on(
        "request",
        /** @param {HTTPRequest} req */
        req => {
          if (
            (opts.block?.requests &&
              opts.block?.requests(req)) ||
            opts.block?.resources?.includes(req.resourceType())
          ) {
            req.abort();
          } else {
            req.continue();
          }
        }
      );
    }

    return this;
  }

  /**
   * Returns the Puppeteer page instance. This is an escape hatch out of Puppe.
   *
   * @returns {Page} The Puppeteer page instance.
   * @throws {Error} If this Puppe instance was not initialized.
   */
  get page() {
    if (!this.#page) {
      throw Error("Puppe was not initialized");
    }

    return this.#page;
  }

  /**
   * Closes the Puppeteer browser used by this Puppe instance.
   *
   * @returns {Promise<void>} A promise that resolves when the Puppeteer browser is closed.
   */
  close() {
    return this.browser?.close();
  }

  /**
   * Identical to page.goto but with waitUntil: "domcontentloaded".
   *
   * @param {string} url - the URL to navigate to.
   * @return {Promise<HTTPResponse | null>}
   */
  goto(url) {
    return this.page.goto(url, {waitUntil: "domcontentloaded"});
  }

  /**
   * A wrapper on Puppeteer's setContent, but with `{waitUntil: "domcontentloaded"}`.
   *
   * @param {string} html - the HTML string to set on the page.
   * @returns {Promise<void>} A promise that resolves when the page has loaded.
   */
  setContent(html) {
    return this.page.setContent(html, {
      waitUntil: "domcontentloaded",
    });
  }

  /**
   * Identical to Puppeteer's `page.title()`.
   *
   * @returns {Promise<string>} The page title
   */
  title() {
    return this.page.title();
  }

  /**
   * Identical to Puppeteer's `page.content()`.
   *
   * @returns {Promise<string>} The page's content
   */
  content() {
    return this.page.content();
  }

  /**
   * Identical to Puppeteer's `page.evaluate()`.
   *
   * @param {string | EvaluateFunc} fn
   * @param {any} args
   * @returns {Promise<any>} The return value of the evaluate block.
   */
  evaluate(fn, ...args) {
    return this.page.evaluate(fn, ...args);
  }

  /**
   * Select by Puppeteer selector (CSS, ::-p-selectors, XPath, etc).
   *
   * @param {string} selector
   * @returns {Object} An object with Puppe actions.
   */
  $(selector) {
    return this.actions(selector);
  }

  /**
   * Select by text.
   *
   * @param {string} text
   * @returns {Object} An object with Puppe actions.
   */
  $text(text) {
    const selector = `::-p-xpath(//*[normalize-space()="${text}"])`;
    return this.actions(selector);
  }

  /**
   * Select by text substring
   *
   * @param {string} text
   * @returns {Object} An object with Puppe actions.
   */
  $containsText(text) {
    return this.actions(`::-p-text("${text}")`);
  }

  /**
   * Select by aria role and name
   *
   * @param {string} role
   * @param {string} name - TODO make optional
   * @returns {Object} An object with Puppe actions.
   */
  $role(role, name) {
    const selector = `::-p-aria([role="${role}"][name="${name}"])`;
    return this.actions(selector);
  }

  /**
   * Returns an object of actions to take on a selector.
   *
   * @param {string} selector - Selector to wait for and interact with.
   * @returns {Object} The Puppe Actions object.
   */
  actions(selector) {
    /**
     * @returns {Promise<ElementHandle>} - Promise that resolves to the ElementHandle.
     * @throws {Error} If element could not be found.
     */
    const wait = async () => {
      return await this.page.waitForSelector(selector);

      // TODO implement no-wait override, but it should be on each action, not on the selection
      /*if (opts?.wait !== false) {
        return this.page.waitForSelector(selector);
      }

      const el = await this.page.$(selector);

      if (el) {
        return el;
      }

      throw Error(
        `Unable to find element matching selector '${selector}'`
      );*/
    };

    /** @type {{opts: PuppeOptions, page: Page}} */
    const {opts: pageOpts, page} = this;

    return {
      // TODO return $-prefixed methods recursively to allow deep chaining?
      /**
       * @returns {Promise<void>}
       */
      async click() {
        const el = await wait();
        return el.evaluate(
          /** @type {(el: Element) => undefined} */
          el => el.click()
        );
      },

      /**
       * @returns {Promise<undefined[]>}
       */
      async clickAll() {
        await wait();
        return page.$$eval(
          selector,
          /** @type {(els: Element[]) => undefined[]} */
          els => els.map(e => e.click())
        );
      },

      /**
       * TODO add throws timeout error
       * @returns {Promise<string>} The element's text if found.
       */
      async text() {
        const el = await wait();
        const text = await el.evaluate(
          /** @type {(el: Element) => string} */
          el => el.textContent ?? ""
        );
        return pageOpts.trimText ? text.trim() : text;
      },

      /**
       *
       */
      async textAll() {
        const el = await wait();
        const text = await page.$$eval(selector, els =>
          els.map(el => el.textContent)
        );
        return pageOpts.trimText
          ? text.map(e => e?.trim())
          : text;
      },

      /**
       *
       * @param {EvaluateFunc} callback - The callback to be executed in the browser context.
       */
      async eval(callback) {
        const el = await wait();
        return el.evaluate(callback);
      },

      /**
       *
       * @param {EvaluateFunc} mapFn
       * @param {...any} args
       */
      async evalAll(mapFn, ...args) {
        await wait();
        return page.$$eval(
          selector,
          (els, mapFn, ...args) =>
            els.map((el, i) => {
              const fn = new Function(`return ${mapFn}`)();
              return fn(el, i, ...args);
            }),
          mapFn.toString(),
          ...args
        );
      },

      /**
       * Evaluate an attribute of an element.
       *
       * @param {string} attribute - Attribute name to evaluate.
       * @returns {Promise<string | null>} - Promise that resolves to the attribute value.
       */
      async attr(attribute) {
        const el = await wait();
        return el.evaluate(
          /** @type {(el: Element, attribute: string) => string | null} */
          (el, attribute) => el.getAttribute(attribute ?? ""),
          attribute
        );
      },

      /**
       *
       * @param {string} attribute
       */
      async attrAll(attribute) {
        await wait();
        return page.$$eval(
          selector,
          (els, attribute) =>
            els.map(el => el.getAttribute(attribute)),
          attribute
        );
      },

      /**
       * Navigates to a link's href
       */
      async gotoHref() {
        const el = await wait();

        const href = await el.evaluate(
          /** @type {(el: Element) => string?} */
          el => el?.getAttribute("href")
        );

        if (!href) {
          throw Error(
            "No href attribute is available on element"
          );
        }

        return page.goto(href, {waitUntil: "domcontentloaded"});
      },

      /**
       * Scrapes a table
       */
      async table() {
        // TODO option to handle headers
        await wait();
        return page.$$eval(selector + " tr", els =>
          els.map(el =>
            [...el.querySelectorAll("td, th")].map(
              el => el.textContent
            )
          )
        );
      },

      /**
       * Simulates typing text into an input field.
       *
       * @param {string} text - Text to type into the element.
       * @param {KeyboardTypeOptions} [options] - Options for typing.
       * @returns {Promise<void>} - Promise that resolves when typing is complete.
       */
      async type(text, options) {
        // TODO check/test
        const el = await wait();
        return el.type(text, options);
      },

      // approved pass-throughs

      /**
       *
       * @param {...any} args
       */
      screenshot(...args) {
        return page.screenshot(...args);
      },

      /**
       *
       */
      content() {
        return page.content();
      },

      /**
       * Wait for a function to be true in the context of the page.
       *
       * @template Func
       * @template Params
       * @param {string | Func} pageFunction - Function or script to be evaluated on the page.
       * @param {FrameWaitForFunctionOptions} [options] - Options for waiting.
       * @param {...Params} args - Arguments to pass to the page function.
       * @returns {Promise<ElementHandle>} - Promise that resolves to a handle for the return type of the function.
       */
      waitForFunction(pageFunction, options, ...args) {
        return page.waitForFunction(
          pageFunction,
          options,
          ...args
        );
      },

      /**
       * Identical to page.waitForRequest
       *
       * @param {string | AwaitablePredicate} urlOrPredicate - URL string or predicate function.
       * @param {WaitTimeoutOptions} [options] - Timeout options.
       * @returns {Promise<HTTPRequest>} A promise that resolves to a Puppeteer HTTPResponse.
       */
      waitForRequest(urlOrPredicate, options) {
        return page.waitForRequest(urlOrPredicate, options);
      },

      /**
       * Identical to page.waitForResponse
       *
       * @param {string | AwaitablePredicate} urlOrPredicate - URL string or predicate function.
       * @param {WaitTimeoutOptions} [options] - Timeout options.
       * @returns {Promise<HTTPResponse>} A promise that resolves to a Puppeteer HTTPResponse.
       */
      waitForResponse(urlOrPredicate, options) {
        return page.waitForResponse(urlOrPredicate, options);
      },
    };
  }
}

const puppe = {
  /**
   * Launches a Puppe instance, which includes a Puppeteer browser and page.
   *
   * @param {PuppeOptions} opts - The configuration options for the Puppe instance.
   * @returns {Promise<Puppe>} A promise that resolves to a Puppe instance.
   */
  async launch(opts) {
    return new Puppe().launch(opts);
  },
};

export default puppe;
