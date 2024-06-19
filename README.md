# Puppe

Puppe is a wrapper on Puppeteer for lightweight web scraping tasks.

Project status: WIP, pre-alpha. Assume everything is unstable.

## Installation

(forthcoming)

```js
npm i puppe
```

## Example

### Puppe:

```js
import puppe from "puppe";

let p;
(async () => {
  const url = "https://www.example.com/";
  p = await puppe.launch({
    launchOptions: {headless: false},
    js: false,
    block: {
      requests: req => req.url() !== url,
      resources: ["stylesheet", "image"],
    },
  });
  await p.goto(url);
  console.log(await p.$text("Example Domain").text());
})()
  .catch(err => console.error(err))
  .finally(() => p?.close());
```

### Equivalent Puppeteeer:

```js
import puppeteer from "puppeteer";

let browser;
(async () => {
  const url = "https://www.example.com/";
  browser = await puppeteer.launch({headless: false});
  const [page] = await browser.pages();
  await page.setJavaScriptEnabled(false);
  const ua =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
  await page.setUserAgent(ua);
  await page.setRequestInterception(true);
  const blockedResources = ["stylesheet", "image"];
  page.on("request", req => {
    if (
      req.url() !== url ||
      blockedResources.includes(req.resourceType())
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });
  await page.goto(url, {waitUntil: "domcontentloaded"});
  const selector = `::-p-xpath(//*[normalize-space()="Example Domain"])`;
  const el = await page.waitForSelector(selector);
  console.log(await el.evaluate(el => el.textContent.trim()));
})()
  .catch(err => console.error(err))
  .finally(() => browser?.close());
```

## Why?

- Less boilerplate than Puppeteer and Playwright
- Enforces best practices for reliability and speed
- Provides sensible, opinionated defaults tuned to web scraping:
  - Auto wait by default
  - Default "domcontentloaded" for speed
  - Default untrusted clicks
  - Default human user agent for anti-detection
  - Single page per launch
  - Trim scraped text by default
  - Selectors and actions for text
- Easy configuration:
  - Easy to set a request blocker to speed up scrapes
  - Easy to disable JS
  - Avoid browser/page management
- Hides footguns and unnecessary features:
  - ElementHandles, which can become stale and are verbose to work with
  - Easily-misused network wait operations (`"load"`, `"networkidle0"`, etc), which are slow and unreliable
  - Visibility-driven trusted clicks, which are unreliable
- Stable, consistent API (Puppeteer has a lot of deprecated features making it confusing to find up-to-date information)
- No dependencies other than Puppeteer

## Audience

The target audience for Puppe includes:

- Beginners to web scraping looking to avoid pitfalls and complexity in larger libraries like Puppeteer. (You should still probably work through a Puppeteer tutorial to understand the basics)
- Experienced web scrapers who want to eliminate boilerplate, hide complexity, enforce best practices and use a lighter-weight tool designed for common case scraping tasks.

## API

All operations auto-wait with `page.waitForSelector()` by default.

A design goal is to be unsurprising for users of Playwright and Puppeteer APIs.

- `puppe.launch(options)` - launches a browser and creates a page with Puppe options.
- `p.goto(url)` - same as Puppeteer `goto`, but with `{waitUntil: "domcontentloaded"}` baked in.
- `p.setContent(html)` - same as Puppeteer `setContent`, but with `{waitUntil: "domcontentloaded"}` baked in.
- `p.evaluate(callback, ...args)` - same as Puppeteer `evaluate`.
- `p.$(selector).click()` - auto-waits and uses an untrusted browser click
- `p.$(selector).click({timeout: 10_000})` - auto-waits TODO
- `p.$(selector).clickAll()` - auto-waits and uses untrusted browser clicks
- `p.$(selector).text()` - auto-waits and returns text content for the first element matched // TODO should this use strict mode and fail if multiple matches? I think probably not
- `p.$(selector).textAll()` - auto-waits and returns text content for multiple elements
- `p.$(selector).eval(callback, ...args)` - auto-waits, then runs Puppeteer `$eval`
- `p.$(selector).evalAll(callback, ...args)` - auto-waits and runs `callback` in the browser with `elements.map` already called
- `p.$(selector).attr(attribute)` - auto-waits and returns `attribute` on first element found
- `p.$(selector).attrAll(attribute)`- auto-waits and returns `attribute`s for all elements found
- `p.$(selector).gotoHref()` - auto-waits and navigates to an element's href with `{ waitUntil: "domcontentloaded" }`
- `p.$(selector).type(text)` - auto-waits and types `text` into the element using standard Puppeteer trusted typing (to fire event handlers).
- `p.$(selector).waitFor()` - auto-waits, generally not necessary // TODO skip?
- `p.$role("button", "Subscribe")` - auto-waits, selects by aria role and aria name
- `p.$text(text).someAction()` - auto-waits for element with exact (whitespace normalized) text (alternate: skip the `p.$text()` and use an arg on the action like `p.byText.click("foo")` or `p.click("foo", p.TEXT)` or `p.click({text: "foo"})` or `p.click({containsText: "foo"})` or `p.click("foo", {byText: true})` or `p.click({exactText: "foo"})`, maybe also `p.click({xpath: ""})` (or not).
- `p.$containsText(text).someAction()` - auto-waits for element containing text
- `p.$(selector).table()` - auto-waits and scrapes table (optionally with headers)
- `p.$frame(frameSelector).$(selector).click()` // TODO
- `p.$fuzzyText("close enough text with levenstein?")` // TODO probably unnecessary?
- `p.$testId("foo")` // TODO but discouraged?
- `p.$(selector).schema({title: text(".foo a"), src("img")})`- auto-waits and scrapes elements by schema // TODO dunno seems to overengineered?

escape hatch:

- `p.page` - access the underlying Puppeteer page instance. If you're using this often, probably just use plain Puppeteer.

Approved pass-through wrappers (may not need?):

- `p.screenshot(opts)` // TODO p.$().screenshot()?
- `p.content()` - discouraged if used to put content into a separate HTML parser

May not offer?

- option to disable auto waits
- `p.restart()`/`p.configure()`//`relaunch()` (or just make it so `.launch()` relaunches the page on the same browser, if the browser is still open?)
- `puppe.on(page, options)` // discouraged/may not offer?

// alternate API (scrapped for this project, but might be worth implementing elsewhere):

- `p.goto(url)` (with fast, reliable "domcontentloaded" default)
- `p.text(selector)`
- `p.textAll(selector)`
- `p.attr(selector, attribute)`
- `p.attrAll(selector, attribute)`
- `p.evaluate(browserCallback)`
- `p.$eval(selector, browserCallback)`
- `p.$$eval(selector, browserCallback)`
- `p.click(selector)` with an untrusted event to avoid visibility issues
- `p.gotoHref(selector)` goes to an element's href, preferred over clicking
- `p.type(selector, text)` // maybe fill()? TODO: inputs?
- `p.wait(selector)` // maybe fill()? TODO: inputs?
- `p.table(selector)`

- `p.waitForFunction(predicate)`
- `p.waitForRequest(predicate)`
- `p.waitForResponse(predicate)`
- `p.waitForSelector(selector)` (generally not necessary since actions auto-wait)
- `p.setContent(html)` // TODO use "domcontentloaded"
- `p.page` escape hatch to access the underlying Puppeteer page if necessary (if you're doing this often, probably don't use Puppe)

- `p.scrapeSchema(selector, {childSelectorSchema})`?
  (discouraged--it's best to use Puppeteer without Puppe if you need to do this often)

- can disable auto-wait?
- handle frames/shadow/page popups better?
- waitForTextChange?

## FAQ

### Why doesn't Puppe support Puppeteer/Playwright feature X?

For more complex use cases that Puppe doesn't support, just use Puppeteer or Playwright.

The intent with Puppe is not to be feature complete, but to provide a simpler subset of Puppeteer well-suited to lightweight scraping tasks.

If there's a certain feature you think would fit well with the Puppe design philosophy, but isn't yet supported, feel free to open an issue.

### Is Puppe designed for testing?

No. Use Playwright for testing.

### Is Puppe designed for making PDFs?

No. Use Puppeteer for making PDFs.

### What's the point of this library when Playwright's locators have solved flakiness?

Although Playwright offers a mature locator-based API which solves many reliability issues in the Puppeteer API, it's more complex than Puppe, where the selectors ("locators") and their actions are unified.

Playwright enforces best practices for test stability by closely approximating the way a human user would interact with a page. But scraping is a simpler, pragmatic domain. There's no imperative to simulate a human user. Bypassing the UI by using gotos rather than clicks, disregarding visibility and actionability, intercepting network requests, disabling JS and blocking resources are acceptable (and desirable, even) in automating outside of quality assurance contexts.

In short, for Puppe's intended use case (lightweight web scraping), it provides a simpler API with more sensible defaults than Playwright.

### But Playwright has codegen!

Feel free to use Playwright if you want codegen. The Puppe workflow is mostly a matter of looking at elements in dev tools and copying them into the actions step by step. No fancy stuff.

<!--
### Why does the library not support chaining?

Many Puppeteer wrappers use chaining, as does Playwright, but Puppe doesn't. A few reasons to avoid chaining:

- It can make debugging harder.
- It's unnecessary since there's no decoupling between locators and actions (reusability in Puppe can happen at the selector string level).
- Puppe only aims to simplify the API of Puppeteer, not pivot to a more clever-looking syntax.
-->

### How do I select by text?

Puppe supports the same selector syntax as Puppeteer with `p.$(selector)`, so all of the familiar approaches like `p.$("::-p-text('Target text')").click()` will work. However, since p-selector syntax is ugly, Puppe has `p.$text(text).click()` and `p.$textContaining(text).click()` to select by whitespace-normalized exact text and substring, respectively. (clicking is not necessary, just used to illustrate the typical action after selecting by text).

If you want to combine text selection with CSS selectors, use Puppeteer's p-selectors, `eval`, or Playwright. Puppe doesn't support deep-chaining idioms like `p.$(outerSelector).$text(innerText).click()`, although maybe it will in the future.

### How do I select by XPath?

Generally, don't. The syntax is complex and XPath tends to promote rigid structures. If you must, Puppe's `selector` parameter supports all of the syntax Puppeteer does, like [`::-p-xpath()`](https://pptr.dev/guides/query-selectors#xpath-selectors--p-xpath).

### How do I work with frames?

Frames can be manipulated with `p.frame(selector)`, which doesn't actually query, but provides a locator-like declaration of intent to work within a frame. Chain your action with `await p.frame(frameSelector).click(selectorInsideFrame)`.

If you want to dive into multiple frames, `p.frame(frameSelector).frame(nestedFrameSelector)` is possible.

If you want to loop over all frames, `p.page.frames()` is available.

### How do I deal with shadow roots?

Use Puppeteer's syntax for this. Shadow roots can be pierced with `>>>`.

### How do I bypass auto-waiting?

Pass `{wait: false}` into any `p.$(selector, options)` call

### Why don't you provide a better way to avoid in-browser querying and ugly `evaluate` work?

For scraping, using the native browser API is natural and sensible. A lot of scrapes start out with experimentation in the browser console. So while Puppe supports shortcuts like `p.$text(selector)`, it also encourages using `evaluate`, `eval` and `evalAll` when it's necessary to dip into browser context and work with comfortable, portable syntax.

The main disadvantages to working in the browser are timing issues (mostly solved by auto-waiting), occasionally verbose syntax for certain operations (mostly solved with convenience wrappers for common operations) and lack of trusted events (less important and sometimes detrimental in scraping).

Some libraries try to fix what's already good and wind up with overcomplicated APIs which aren't necessarily that much more synactically suave or more reliable than good old fashioned browser code.

### Why don't you let the user manage the browser like some other Puppeteer extensions?

Hiding the browser and page cuts down on boilerplate and is consistent with the intent of Puppe, hiding complexity and providing opinionated defaults. You can still configure launch args and access the underlying page and browser if you really need to, but it defeats the purpose of the library to use this escape hatch often.

Rather than extending or proxying Puppeteer, this library is a wrapper that acts as a [facade](https://en.wikipedia.org/wiki/Facade_pattern), hiding complexity and only exposing a simplified subset of features.

### Why do you still use ElementHandles under the hood, even though they're flaky?

In theory, Puppeteer code like:

```js
const el = await page.waitForSelector(selector);
await el.click();
```

has a pitfall: the element handle `el` points to can be removed from the document in the split second prior to clicking it. A more reliable approach would move both calls into a single `evaluate`.

But at the present time, Puppeteer doesn't offer anything comparable to Playwright's locator API, which was designed from the ground-up to eliminate separate calls for locating and acting. Puppeteer's locator API is experimental and seems to miss most of the good parts of the Playwright locator API, so I avoid it.

Since there's no simple way to eliminate this race condition with the classical Puppeteer API (it could be implemented inside of `evaluate()`, but then the extra selector syntax Puppeteer offers for working with XPath, text, aria roles and shadow roots would have to be reimplemented), the library lives with it. In practice, I've rarely, if ever, found this to cause any issues. The more common race conditions I've seen typically have to do with navigation.

I'm open to better solutions on this point.

### Why no TypeScript?

Lack of time and I don't find it necessary for light scraping tasks this library was designed for. I'd like to add it though, especially since a good deal of Puppeteer and Playwright bugs occur from typoing config object arguments and or mixing up argument types (like passing a handle when a string is required). For Puppe, most arguments are strings, so the main thing to worry about is config objects. Getting rid of element handles saves a fair amount of pain.

### Why did you use the syntax you did?

Many Puppeteer wrappers use DSLs or chaining to avoid `await` and/or make the library feel more functional. I like Puppeteer's general imperative style and didn't wish to change or "improve" it, but I found that using Playwright-lite-style "locators", except without multiple steps of chaining to be ideal. `p.$().action()` is the standard idiom in Puppe, which corresponds to Playwright's `page.locator().action()`. `$` represents a general browser selection.

I like the idea of a simple scraping-oriented DSL in theory, but that'd be a different project since there'd be a learning curve for users, and a lot of reinventing the wheel to make it possible.

### How do I sleep/wait?

Generally, don't, unless you're debugging. In that case, use an option [here](). TODO add rationale. There's no need for a scraping library to offer sleeps, which is why sleeps were removed from Puppeteer.

### What is the `p` object returned by `puppe.launch()`?

This is a Puppe instance, a wrapper on top of a Puppeteer `page`. I call it `p` because it's short and easy to work with, and the abbreviation shouldn't be confusing in the sort of scripts Puppe was designed to support.

If you want a more verbose name, I suggest using `pup` rather than `page` to avoid confusion with Puppeteer page objects.You can also import Puppe with a capital `P` and use `puppe` lowercase for the instance.

## Recommended patterns

- Avoid clicks that trigger navigations. A better approach is to use `goto` whenever possible, pulling the link out of an `href`. This can be done with `p.$(selector).gotoHref()`.
- If you do click to trigger a navigation, avoid using a network idle. Instead, wait for a specific predicate (selector, response, request, etc) on the destination page. Navigation click race conditions are a classic source of slowness and unreliability in Puppeteer, so they're not exposed in Puppe.
- For scraping information in a container, say a list of card elements, select the card containers and use `evalAll` to extract data from each one:

  ```js
  // TODO could provide puppe.text(sel) in browser
  p.$(containerClass).evalAll(el => ({
    title: el.querySelector("h3").textContent().trim(),
    price: el.querySelector('[data-testid="price"]').textContent.trim(),
    // ...
  }));`
  ```

- For scraping a table, `evalAll` on the table rows:

  ```js
  p.$(table tr).evalAll(el => el.querySelector("td").textContent.trim());
    price: el.querySelector('[data-testid="price"]').textContent.trim(),
    // ...
  }));`
  ```

Avoid "parallel arrays" scraping, like grabbing all titles and all links separately, then zipping them together afterwards.

- Generally avoid using third-party libraries with Puppe. If you want to dump the HTML into Cheerio and aren't interested in manipulating the live page, Puppe can still be somewhat handy because of its sensible loading defaults and resource blocks, but it's not the intended use case.
- Prefer using fetch and Cheerio for static pages, unless the site blocks your requests.

...

See my blog posts for more recommendations : TODO add. None of them are specific to Puppe, but should help motivate why I designed it as I did.

## Prior art

- ????

## Contributions

Feel free to open issues and PR contributions.

## Development

```
git clone https://github.com/ggorlen/puppe.git
cd puppe
npm i
npm test
npm run test-types
npm run lint
npm run format
```

---

## TODO (somewhat outdated; remove soon after grabbing what's needed)

- can add $$evalMap: https://stackoverflow.com/a/78414959/6243352 (don't forget to add args)
- Add solutions to playground tests:
  - http://www.uitestingplayground.com
  - https://demoqa.com/
  - https://the-internet.herokuapp.com
  - https://magento.softwaretestingboard.com/vulcan-weightlifting-tank.html#review-form
  - https://web.archive.org/web/20211029183018/https://practice.automationbro.com/contact/ and https://stackoverflow.com/a/75778266/6243352
- useful resource for puppe to specify package.json types: https://unpkg.com/browse/vue@3.4.21/package.json
- prohibit timeout: 0 or raise warning if too long?
- maybe have it so you can pass playwright in after all, so it's more compatible with future puppeteer versions and doesn't have the dependency so much?
- add frame handling to puppe: https://stackoverflow.com/questions/59431296/trying-to-click-a-button-within-an-iframe-with-puppeteer
- Puppe may need navClick if the selectors are all the same on the other page? or use goto?: https://stackoverflow.com/questions/77090738/puppeteer-cannot-target-checkbox-on-hotel-website/77090983#77090983
- puppe isolate element for screenshot `p.$("...").screenshot()`
- autogenerate docs from jsdoc
- add type generation d.ts https://www.typescriptlang.org/docs/handbook/declaration-files/dts-from-js.html
- add [`navClick`](https://stackoverflow.com/a/77090983/6243352)
- add `waitForConsoleLog`: https://stackoverflow.com/a/74953115/6243352
- screenshot?
- release npm package
- block CSS and other types
- add user agent override
- add request/response interceptors
- polling/retries (not sure what I meant when I wrote this)
- wait for selector in arbitrarily nested iframes or shadow doms
- flag to wait for all
- research adding as a puppeteer-extra plugin
- wait for dialog promisified on("dialog")
- tests
- consider a command line API?
- could move launch flags as argument to a new func that launches the browser
