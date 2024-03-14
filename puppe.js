const puppe = page => {

  const blockImages = async () => {
    await page.setRequestInterception(true);
    page.on("request", req => {
      if (req.resourceType() === "image") {
        req.abort();
      }
      else {
        req.continue();
      }
    });
  };

  const waitForElementOrSelector = async elOrSel =>
    typeof elOrSel === "string"
      ? (await page.waitForSelector(elOrSel)) : elOrSel;

  const nativeClick = async elOrSel =>
    (await waitForElementOrSelector(elOrSel)).evaluate(el => el.click());

  const text = async elOrSel =>
    (await waitForElementOrSelector(elOrSel))
      .evaluate(el => el.textContent);

  const textAll = async elsOrSel =>
    Array.isArray(elsOrSel) ? Promise.all(elsOrSel.map(text)) :
    (await waitForElementOrSelector(elsOrSel)).evaluate((_, sel) =>
      [...document.querySelectorAll(sel)].map(e => e.textContent),
      elsOrSel
    );

  const waitForTextChange = async (
    elOrSel,
    opts={polling: "mutation", timeout: 30000}
  ) => {
    const el = await waitForElementOrSelector(elOrSel);
    const originalText = await el.evaluate(el => el.textContent);
    return page.waitForFunction(
      (el, originalText) => el.textContent !== originalText,
      opts, el, originalText,
    );
  };

  const waitForAllMatchingSelectors = async sel => {
    // https://stackoverflow.com/questions/49946728/puppeteer-waitforselector-on-multiple-selectors/73617010#73617010
    const matches = await page.waitForFunction(sel => {
      const matches = [...document.querySelectorAll(sel)];
      return matches.length ? matches : null;
    }, sel);
    const length = await matches.evaluate(e => e.length);
    return Promise.all([...Array(length)].map((e, i) =>
      page.evaluateHandle((m, i) => m[i], matches, i)
    ));
  };

  const attachPuppeteerVisibilityCheck = () =>
    page.evaluate(() => {
      window.isVisible = window.isVisible || (element => {
        // checkWaitForOptions from Puppeteer src/common/util.ts
        // https://github.com/puppeteer/puppeteer/blob/32400954c50cbddc48468ad118c3f8a47653b9d3/src/common/util.ts#L354
        const style = window.getComputedStyle(element);
        const isVisible =
          style && style.visibility !== 'hidden' && hasVisibleBoundingBox();
        return isVisible;
      
        function hasVisibleBoundingBox() {
          const rect = element.getBoundingClientRect();
          return !!(rect.top || rect.bottom || rect.width || rect.height);
        }
      });
    });

  const waitForFirstVisible = async sel => {
    // https://stackoverflow.com/questions/73615623/wait-for-first-visible-among-multiple-elements-matching-selector/73616378#73616378
    await attachPuppeteerVisibilityCheck();
    return await page.waitForFunction(sel => 
      [...document.querySelectorAll(sel)].find(isVisible), sel
    );
  };

  const waitForDOMStable = (
    options={timeout: 30000, idleTime: 2000}
  ) =>
    page.evaluate(({timeout, idleTime}) =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          observer.disconnect();
          const msg = `timeout of ${timeout} ms ` +
            "exceeded waiting for DOM to stabilize";
          reject(Error(msg));
        }, timeout);
        const observer = new MutationObserver(() => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(finish, idleTime);
        });
        const config = {
          attributes: true,
          childList: true,
          subtree: true
        };
        observer.observe(document.body, config);
        const finish = () => {
          observer.disconnect();
          resolve();
        };
        let timeoutId = setTimeout(finish, idleTime);
      }),
      options
    )
  ;

  const listenToConsole = () => {
    const onPageConsole = msg =>
      Promise.all(msg.args().map(e => e.jsonValue()))
        .then(args => console.log(...args));
    page.on("console", onPageConsole);
  };

  const p = {
    blockImages,
    waitForElementOrSelector,
    nativeClick,
    text,
    textAll,
    waitForTextChange,
    waitForAllMatchingSelectors,
    attachPuppeteerVisibilityCheck,
    waitForFirstVisible,
    waitForDOMStable,
    listenToConsole,
  };

  const handler = {
    get(target, propKey, receiver) {
      const c = propKey in page ? page : p;

      if (typeof c[propKey] === "function") {
        // or: return (...args) => c[propKey](...args);
        return c[propKey].bind(c);
      }
    }
  };

  return new Proxy(p, handler);
};

module.exports = puppe;
