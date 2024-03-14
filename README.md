# puppe

WIP collection of Puppeteer helper functions

### TODO

- add [`navClick`](https://stackoverflow.com/a/77090983/6243352)
- add `waitForConsoleLog`: https://stackoverflow.com/a/74953115/6243352
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

- could move launch flags as argument to a new func that launches the browser
  - auto close browser when done to simplify boilerplate

Consider implementing a sane subset of Playwright, with auto waiting (`$eval`, `$$eval`, etc with auto wait), or only exposing page via a property rather than a proxy.
