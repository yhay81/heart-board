import { describe, expect, it } from "vitest";

import packageJson from "../package.json?raw";
import robots from "../public/robots.txt?raw";
import sitemap from "../public/sitemap.xml?raw";
import productReadme from "../README.md?raw";
import product from "../src/config/product.ts?raw";
import wrangler from "../wrangler.jsonc?raw";

describe("publishing contract", () => {
  it("uses the product yhay81.com subdomain as the only production origin", async () => {
    for (const content of [product, wrangler, packageJson, robots, sitemap, productReadme]) {
      expect(content).toContain("heart-board.yhay81.com");
      expect(content).not.toContain("yusuke8h.workers.dev");
    }
    expect(wrangler).toContain('"workers_dev": false');
    expect(wrangler).toContain('"custom_domain": true');
  });
});
