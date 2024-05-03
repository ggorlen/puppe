import puppeteer from "puppeteer";

/**
 * @typedef {import("puppeteer").Page} Page
 * @typedef {import("puppeteer").Browser} Browser
 * @typedef {import("puppeteer").ElementHandle} ElementHandle
 */

// TODO handle relaunch?
class Puppe {
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

  page() {
    return this.page;
  }

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

  setContent(html) {
    return this.page.setContent(html, {
      waitUntil: "domcontentloaded",
    });
  }

  title(...args) {
    return this.page.title(...args);
  }

  content() {
    return this.page.content();
  }

  evaluate(...args) {
    return this.page.evaluate(...args);
  }

  $text(text, opts) {
    const selector = `::-p-xpath(//*[normalize-space()="${text}"])`;
    return this.actions(selector, opts);
  }

  $containsText(text, opts) {
    return this.actions(`::-p-text("${text}")`, opts);
  }

  $(selector, opts) {
    return this.actions(selector, opts);
  }

  actions(selector, opts = {}) {
    const waitForSelector = () =>
      opts.wait === false
        ? this.page.$(selector) // TODO improve error if this returns null
        : this.page.waitForSelector(selector);
    const {opts: pageOpts, page} = this;
    return {
      // TODO return $-prefixed methods recursively to allow deep chaining?
      async click() {
        const el = await waitForSelector();
        return el.evaluate(el => el.click());
      },
      async clickAll() {
        await waitForSelector();
        return page.$$eval(selector, els =>
          els.map(e => e.click())
        );
      },
      async text() {
        const el = await waitForSelector();
        const text = await el.evaluate(el => el.textContent);
        return pageOpts.trimText ? text.trim() : text;
      },
      async textAll() {
        const el = await waitForSelector();
        const text = await page.$$eval(selector, els =>
          els.map(el => el.textContent)
        );
        return pageOpts.trimText
          ? text.map(e => e.trim())
          : text;
      },
      async eval(callback) {
        const el = await waitForSelector();
        return el.evaluate(callback);
      },
      async evalAll(mapFn, ...args) {
        await waitForSelector();
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
      async attr(attribute) {
        const el = await waitForSelector();
        return el.evaluate(
          (el, attribute) => el.getAttribute(attribute),
          attribute
        );
      },
      async attrAll(attribute) {
        await waitForSelector();
        return page.$$eval(
          selector,
          (els, attribute) =>
            els.map(el => el.getAttribute(attribute)),
          attribute
        );
      },
      async gotoHref() {
        const el = await waitForSelector();
        const href = await el.evaluate(el =>
          el.getAttribute("href")
        );
        return page.goto(href, {waitUntil: "domcontentloaded"});
      },
      async table() {
        // TODO option to handle headers
        await waitForSelector();
        return page.$$eval(selector + " tr", els =>
          els.map(el =>
            [...el.querySelectorAll("td, th")].map(
              el => el.textContent
            )
          )
        );
      },

      // approved pass-throughs
      screenshot(...args) {
        return page.screenshot(...args);
      },
      content(...args) {
        return page.content(...args);
      },
      waitForFunction(...args) {
        return page.waitForFunction(...args);
      },
      waitForRequest(...args) {
        return page.waitForRequest(...args);
      },
      waitForResponse(...args) {
        return page.waitForResponse(...args);
      },
    };
  }
}

const puppe = {
  launch(...args) {
    return new Puppe().launch(...args);
  },
};

export default puppe;
