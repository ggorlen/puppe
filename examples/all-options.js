import puppe from "../src/puppe.js";

let p;
(async () => {
  const url = "https://www.example.com/";
  p = await puppe.launch({
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    js: true,
    defaultTimeout: 15_000,
    block: {
      /**
       *
       * @param req
       */
      requests: req => req.url() !== url,
      resources: ["stylesheet", "script"],
    },
    launchOptions: {
      // passed to puppeteer.launch()
      headless: true,
    },
  });
  await p.goto(url); // domcontentloaded by default
  console.log(await p.$text("Example Domain").text());
})()
  .catch(err => console.error(err))
  .finally(() => p?.close());
