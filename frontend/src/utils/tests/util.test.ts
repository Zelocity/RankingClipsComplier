import { describe, expect, it } from "vitest";
import { createNewItem } from "./listUtils";

describe("createNewItem", () => {
  it("creates an item using the given ID", () => {
    const item = createNewItem(4);

    expect(item.slotId).toBe("4");
    expect(item.title).toBe("4");
  });
});
