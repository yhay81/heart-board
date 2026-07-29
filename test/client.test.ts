import { describe, expect, it } from "vitest";

import boardScript from "../public/board.js?raw";

describe("board telemetry", () => {
  it("counts every board session as a visit and filtered sessions separately", () => {
    expect(boardScript).toContain('name: "visited"');
    expect(boardScript).toContain('context: "home"');
    expect(boardScript).toContain('name: "filters_used"');
    expect(boardScript).toContain("if (filtered)");
  });
});
