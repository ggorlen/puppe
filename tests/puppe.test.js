import puppeteer from "puppeteer";
import puppe from "../src/puppe";

/**
 * Testing utility function that wraps HTML with a timeout
 * to add it to the document after a delay.
 *
 * @param {string} html - the HTML to inject into the page after a timeout.
 * Should be quoted so that the final string is syntactically valid.
 * @param {number} ms - the timeout delay to add the element after.
 * @returns {string} the HTML with the element added after the timeout.
 */
const timeout = (html, ms = 10) =>
  `<!DOCTYPE html><html lang="en"><body><script>
  setTimeout(() => {
    document.body.innerHTML = ${html};
  }, ${ms});
  </script></body></html>`;

let p;
beforeEach(async () => {
  p = await puppe.launch({launchOptions: {headless: true}, timeout: 2_000});
});
afterEach(() => p.close());

it.todo("write tests for timeout args on most actions");
it.todo("write tests for overriding wait on most actions");
it.todo("write tests for frames");

describe("top-level", () => {
  describe("page", () => {
    it("should provide .page to access the Puppeteer Page", async () => {
      expect(await p.page.browser()).toBeDefined();
    });
  });

  describe("content", () => {
    it("should return HTML content, same as Puppeteer", async () => {
      const html = "<html><head></head><body></body></html>";
      expect(await p.content()).toBe(html);
    });
  });

  describe("setContent", () => {
    it("should set HTML content", async () => {
      const html =
        "<html><head></head><body><p>hello world</p></body></html>";
      await p.setContent("<p>hello world</p>");
      expect(await p.content()).toBe(html);
    });

    it.todo("should use domcontentloaded");
  });

  describe("goto", () => {
    it("should navigate to a page", async () => {
      await p.goto("https://example.com");
      expect(await p.page.title()).toBe("Example Domain");
    });

    it.todo("should use domcontentloaded");
  });

  describe("title", () => {
    it("should return a page title", async () => {
      await p.setContent(`<head><title>foo</title></head>`);
      expect(await p.title()).toBe("foo");
    });
  });

  describe("evaluate", () => {
    it("should operate the same as Puppeteer", async () => {
      const sum = await p.evaluate((x, y) => 42 + x + y, 1, 2);
      expect(sum).toBe(45);
    });
  });
});

describe("selectors", () => {
  describe("$", () => {
    it("should return a Puppe object with action methods", () => {
      expect(p.$("p").click).toBeInstanceOf(Function);
    });

    it.todo("use a type check to validate");
  });

  describe("$text", () => {
    it("should wait and find an element by exact text", async () => {
      const html = timeout("'<p>barfoobar</p><p>foo</p>'");
      await p.setContent(html);
      expect(await p.$text("foo").text()).toBe("foo");
    });
  });

  describe("$containsText", () => {
    it("should wait and find an element by text substring", async () => {
      const html = timeout("'<p>barfoobar</p><p>foo</p>'");
      await p.setContent(html);
      expect(await p.$containsText("foo").text()).toBe(
        "barfoobar"
      );
    });
  });

  describe("$role", () => {
    it("should wait and find an element by Aria role and name", async () => {
      // 10ms sometimes hangs due to what seems like a Pupp bug, so use 50ms
      // https://github.com/puppeteer/puppeteer/issues/12625
      const html = timeout("'<h1>foo</h1>'", 50);
      await p.setContent(html);
      expect(await p.$role("heading", "foo").text()).toBe("foo");
    });
  });
});

describe("actions", () => {
  describe("click", () => {
    it("should wait and native click an element", async () => {
      const html = timeout(`
      \`<button
        style="display: none;"
        onclick="this.textContent = 'X';"
      ></button>\`
    `);
      await p.setContent(html);
      await p.$("button").click();
      expect(await p.$("button").text()).toBe("X");
    });
  });

  describe("clickAll", () => {
    it("should wait and native click elements", async () => {
      const html = timeout(`
      \`<button
        style="display: none;"
        onclick="this.textContent = 'X';"
      ></button>\`.repeat(3)
    `);
      await p.setContent(html);
      await p.$("button").clickAll();
      const text = await p.$("button").textAll();
      expect(text).toEqual(["X", "X", "X"]);
    });
  });

  describe("gotoHref", () => {
    it("should wait and navigate to an href", async () => {
      const html = timeout(
        `'<a href="https://www.example.com"></a>'`
      );
      await p.setContent(html);
      await p.$("a").gotoHref();
      expect(await p.$("h1").text()).toBe("Example Domain");
    });
  });

  describe("text", () => {
    it("should wait and extract text from an element", async () => {
      const html = timeout("'<p>foo</p'");
      await p.setContent(html);
      expect(await p.$("p").text()).toBe("foo");
    });
  });

  describe("textAll", () => {
    it("should wait and extract text from multiple elements", async () => {
      const html = timeout("'<p>foo</p><p>bar</p>'");
      await p.setContent(html);
      expect(await p.$("p").textAll()).toEqual(["foo", "bar"]);
    });
  });

  describe("attr", () => {
    it("should wait and extract an attribute from an element", async () => {
      const html = timeout(`'<a href="foo"></a>'`);
      await p.setContent(html);
      expect(await p.$("a").attr("href")).toBe("foo");
    });
  });

  describe("attrAll", () => {
    it("should wait and extract attributes from elements", async () => {
      const html = timeout(
        `'<a href="foo"></a><a href="bar"></a>'`
      );
      await p.setContent(html);
      const hrefs = await p.$("a").attrAll("href");
      expect(hrefs).toEqual(["foo", "bar"]);
    });
  });

  describe("eval", () => {
    it("should return the content of a paragraph", async () => {
      const html = timeout("'<p>foo</p>'");
      await p.setContent(html);
      const text = await p.$("p").eval(p => p.textContent);
      expect(text).toBe("foo");
    });

    it("should wait, then return the href of a link", async () => {
      const html = `<script>
    setTimeout(() => {
      document.body.innerHTML = '<a href="test"></a>';
    }, 100);
    </script>`;
      await p.setContent(html);
      const href = await p.$("a").eval(el => el.href);
      expect(href).toBe("test");
    });

    it.todo("should allow passing args in");
  });

  describe("evalAll", () => {
    it("should return the content of a table", async () => {
      const html = `<table>
      <tr>
        <td>a</td>
        <td>b</td>
        <td>c</td>
      </tr>
      <tr>
        <td>d</td>
        <td>e</td>
        <td>f</td>
      </tr>
    </table>`;
      await p.setContent(html);
      const data = await p
        .$("tr")
        .evalAll(row =>
          [...row.querySelectorAll("td")].map(e => e.textContent)
        );
      expect(data).toEqual([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("should wait, then return the text of a list", async () => {
      const html = `<ul></ul><script>
    setTimeout(() => {
      document.querySelector("ul").innerHTML = "<li>a</li><li>b</li>";
    }, 10);
    </script>`;
      await p.setContent(html);
      const list = await p
        .$("li")
        .evalAll((el, i) => el.textContent + i);
      expect(list).toEqual(["a0", "b1"]);
    });

    it("should allow passing args in", async () => {
      const html = "<ul><li>a</li><li>b</li></ul>";
      await p.setContent(html);
      const data = await p
        .$("li")
        .evalAll(
          (el, i, customArg1, {customArg2}) =>
            el.textContent + customArg1 + customArg2,
          " [X]",
          {customArg2: 42}
        );
      expect(data).toEqual(["a [X]42", "b [X]42"]);
    });
  });

  describe("table", () => {
    it("should return the content of a table without headers", async () => {
      const html = `<table>
      <tr>
        <td>a</td>
        <td>b</td>
        <td>c</td>
      </tr>
      <tr>
        <td>d</td>
        <td>e</td>
        <td>f</td>
      </tr>
    </table>`;
      await p.setContent(html);
      const data = await p.$("table").table();
      expect(data).toEqual([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });
});
