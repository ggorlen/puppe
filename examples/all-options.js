const puppe = require("../src/puppe");

let p;
(async () => {
  const url = "https://www.example.com/";
  p = await puppe.launch({
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
    js: true,
    defaultTimeout: 15_000,
    block: {
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
