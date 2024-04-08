const puppeteer = require("puppeteer");

const puppe = {
  async launch(opts) {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    const defaults = Object.freeze({
      launchOptions: {},
      ua,
      js: true,
      timeout: 15_000,
      navigationTimeout: 15_000,
      captureBrowserConsole: false,
      trimText: true,
      block: {
        requests: req => true,
        resources: [],
      },
      // TODO allow: (overrides block)
      // addScript ?
    });
    this.opts = opts = {...defaults, ...opts};
    this.browser = await puppeteer.launch(opts.launchOptions);
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
      const blockedResources = ["stylesheet", "image"];
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
  },

  page() {
    return this.page;
  },

  close() {
    return this.browser?.close();
  },

  goto(url) {
    return this.page.goto(url, {waitUntil: "domcontentloaded"});
  },

  setContent(html) {
    return this.page.setContent(html, {
      waitUntil: "domcontentloaded",
    });
  },

  evaluate(callback) {
    return this.page.evaluate(callback);
  },

  $text(text, opts) {
    const selector = `::-p-xpath(//*[normalize-space()="${text}"])`;
    return this.actions(selector, opts);
  },

  $containsText(text, opts) {
    return this.actions(`::-p-text("${text}")`, opts);
  },

  $(selector, opts) {
    return this.actions(selector, opts);
  },

  actions(selector, opts = {}) {
    const waitForSelector = () =>
      opts.wait === false
        ? this.page.$(selector)
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
      async evalAll(callback) {
        // TODO support string cb
        await waitForSelector();
        return page.$$eval(
          selector,
          els => els.map(callback),
          callback
        );
      },
      async attr(attribute) {
        const el = await waitForSelector();
        return el.evaluate(
          (el, attribute) => el.getAttribute(attribute),
          attribute
        );
      },
      async attrAll(callback) {
        await waitForSelector();
        return page.$$eval(
          selector,
          els => els.map(callback),
          callback
        );
      },
      async gotoHref() {
        const el = await waitForSelector();
        const href = await el.evaluate(el =>
          el.getAttribute("href")
        );
        return page.goto(href, {waitUntil: "domcontentloaded"});
      },
    };
  },
};

module.exports = puppe;
