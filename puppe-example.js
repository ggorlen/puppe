const puppe = require("./puppe");
const puppeteer = require("puppeteer");

let browser;
(async () => {
  const html = `
    <h2>foo</h2>
    <h2>baz</h2>
    <h2>qux</h2>
    <script>
      setTimeout(() => document.querySelector("h2").innerText = "bar", 4000);
    </script>
  `;
  browser = await puppeteer.launch({headless: true});
  const [page] = await browser.pages();
  const p = puppe(page);
  await p.setContent(html);
  await p.waitForTextChange("h2");
  console.log(await p.$eval("h2", el => el.innerText));
  console.log(await p.textAll("h2"));
})()
  .catch(err => console.error(err))
  .finally(async () => await browser.close())
;
