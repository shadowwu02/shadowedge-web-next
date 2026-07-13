import assert from "node:assert/strict";

import { shouldIgnoreMentionMenuScroll } from "../src/lib/video/mentionMenuScroll.ts";

const menu = { id: "menu" };
const menuItem = { id: "menu-item" };
const workspace = { id: "workspace" };
const scrollContainer = {
  contains(target) {
    return target === menu || target === menuItem;
  },
};

assert.equal(shouldIgnoreMentionMenuScroll(menu, scrollContainer), true);
assert.equal(shouldIgnoreMentionMenuScroll(menuItem, scrollContainer), true);
assert.equal(shouldIgnoreMentionMenuScroll(workspace, scrollContainer), false);
assert.equal(shouldIgnoreMentionMenuScroll(null, scrollContainer), false);
assert.equal(shouldIgnoreMentionMenuScroll(menu, null), false);

console.log("mention menu scroll tests passed");
