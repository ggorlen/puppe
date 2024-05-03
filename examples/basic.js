import puppe from "../src/puppe.js";

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
