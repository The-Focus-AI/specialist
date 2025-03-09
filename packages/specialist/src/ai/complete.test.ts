import { describe, it, expect } from "@jest/globals";
import { complete } from "./complete.js";

describe("complete command", () => {
  it("should be defined", () => {
    expect(complete).toBeDefined();
  });
});
