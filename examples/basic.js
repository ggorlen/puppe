const puppe = require("../src/puppe");

let p;
(async () => {
  const url = "https://www.example.com/";
  p = await puppe.launch({
    launchOptions: { headless: true },
    js: false,
    block: {
      requests: req => req.url() !== url,
      resources: ["stylesheet", "image"],
    },
  });
  await p.goto(url);
  console.log(await p.$("h1").text());
})()
  .catch(err => console.error(err))
  .finally(() => p?.close());
