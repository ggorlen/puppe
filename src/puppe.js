import puppeteer from "puppeteer";

/**
 * @typedef {import("puppeteer").Page} Page
 * @typedef {import("puppeteer").Browser} Browser
 * @typedef {import("puppeteer").ElementHandle} ElementHandle
 */

// TODO handle relaunch?
/**
 *
 */
class Puppe {
  /**
   *
   * @param opts
   */
  async launch(opts) {
    const ua =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
    const defaults = Object.freeze({
      launchOptions: {},
      ua,
      js: true,
      timeout: 15_000,
      navigationTimeout: 15_000,
      captureBrowserConsole: false,
      trimText: true,
      block: {
        /**
         *
         * @param req
         */
        requests: req => false,
        resources: [],
      },
      // TODO allow: (overrides block)
      // addScript ?
    });
    this.opts = opts = {...defaults, ...opts};
    this.browser = await puppeteer.launch(opts.launchOptions);

    /** @type {Page} */
    const [page] = await this.browser.pages();
    this.page = page;
    await page.setUserAgent(opts.ua);
    await page.setJavaScriptEnabled(opts.js);
    await page.setDefaultNavigationTimeout(
      opts.navigationTimeout
    );
    await page.setDefaultTimeout(opts.timeout);

    if (opts.captureBrowserConsole) {
      /**
       *
       * @param msg
       */
      const onPageConsole = msg =>
        Promise.all(msg.args().map(e => e.jsonValue())).then(
          args => console.log(...args)
        );
      page.on("console", onPageConsole);
    }

    if (opts.block.requests || !opts.block.resources?.length) {
      await page.setRequestInterception(true);
      page.on("request", req => {
        if (
          (opts.block.requests && opts.block.requests(req)) ||
          opts.block.resources?.includes(req.resourceType())
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });
    }

    return this;
  }

  /**
   *
   */
  page() {
    return this.page;
  }

  /**
   *
   */
  close() {
    return this.browser?.close();
  }

  /**
   * Same as page.goto but with waitUntil: "domcontentloaded".
   * @param {string} url - the URL to navigate to.
   * @return {Promise<Response>}
   */
  goto(url) {
    return this.page.goto(url, {waitUntil: "domcontentloaded"});
  }

  /**
   *
   * @param html
   */
  setContent(html) {
    return this.page.setContent(html, {
      waitUntil: "domcontentloaded",
    });
  }

  /**
   *
   * @param {...any} args
   */
  title(...args) {
    return this.page.title(...args);
  }

  /**
   * Same as Puppeteer's page.content()
   * @returns {Promise<string>} the page's content
   */
  content() {
    return this.page.content();
  }

  /**
   * Same as Puppeteer's page.evaluate()
   * @param {...any} args
   */
  evaluate(...args) {
    return this.page.evaluate(...args);
  }

  /**
   * Select by Puppeteer selector (CSS, ::-p-selectors, etc)
   * @param selector
   * @param opts
   */
  $(selector, opts) {
    return this.actions(selector, opts);
  }

  /**
   * Select by text
   * @param {string} text
   * @param opts
   */
  $text(text, opts) {
    const selector = `::-p-xpath(//*[normalize-space()="${text}"])`;
    return this.actions(selector, opts);
  }

  /**
   *
   * @param {string} text
   * @param opts
   */
  $containsText(text, opts) {
    return this.actions(`::-p-text("${text}")`, opts);
  }

  /**
   * Select by text
   * @param {string} role
   * @param {string} name
   * @param opts
   */
  $role(role, name, opts) {
    const selector = `::-p-aria([name="${name}"][role="${role}"])`;
    return this.actions(selector, opts);
  }

  /**
   *
   * @param {string} selector
   * @param opts
   */
  actions(selector, opts = {}) {
    /**
     *
     */
    const wait = async () => {
      if (opts.wait !== false) {
        return this.page.waitForSelector(selector);
      }

      const el = await this.page.$(selector);

      if (!el) {
        throw Error(`Unable to find element matching selector '${selector}'`);
      }

      return el;
    };

    const {opts: pageOpts, page} = this;
    return {
      // TODO return $-prefixed methods recursively to allow deep chaining?
      /**
       *
       */
      async click() {
        const el = await wait();
        return el.evaluate(el => el.click());
      },
      /**
       *
       */
      async clickAll() {
        await wait();
        return page.$$eval(selector, els =>
          els.map(e => e.click())
        );
      },
      /**
       *
       */
      async text() {
        const el = await wait();
        const text = await el.evaluate(el => el.textContent);
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
          ? text.map(e => e.trim())
          : text;
      },
      /**
       *
       * @param callback
       */
      async eval(callback) {
        const el = await wait();
        return el.evaluate(callback);
      },
      /**
       *
       * @param mapFn
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
       *
       * @param attribute
       */
      async attr(attribute) {
        const el = await wait();
        return el.evaluate(
          (el, attribute) => el.getAttribute(attribute),
          attribute
        );
      },
      /**
       *
       * @param attribute
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
        const href = await el.evaluate(el =>
          el.getAttribute("href")
        );

        if (!href) {
          throw Error("No href attribute is available on element");
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
       *
       */
      // TODO check/test
      async type(...args) {
        const el = await wait();
        return el.type(...args);
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
       * @param {...any} args
       */
      content(...args) {
        return page.content(...args);
      },
      /**
       *
       * @param {...any} args
       */
      waitForFunction(...args) {
        return page.waitForFunction(...args);
      },
      /**
       * Same as Page.waitForRequest
       * @param {...any} args
       */
      waitForRequest(...args) {
        return page.waitForRequest(...args);
      },
      /**
       * Same as Page.waitForResponse
       * @param {...any} args
       */
      waitForResponse(...args) {
        return page.waitForResponse(...args);
      },
    };
  }
}

const puppe = {
  /**
   *
   * @param {...any} args
   */
  launch(...args) {
    return new Puppe().launch(...args);
  },
};

export default puppe;
