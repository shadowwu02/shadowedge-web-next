import { strict as assert } from "node:assert";
import {
  convertVisibleMentionsToTokens,
  findPromptMentions,
  getReferencePromptBindings,
  type MentionableMediaItem,
} from "./video-mentions";

const firstReadyImage: MentionableMediaItem = {
  id: "image-reference-1",
  type: "image",
  index: 1,
  display: "@图1",
  displayToken: "@Image 1",
  localizedToken: "@图1",
  canonicalToken: "【@图1】",
  token: "【@图1】",
  url: "https://cdn.example.test/assets/image-reference-1.png",
  previewUrl: "https://cdn.example.test/assets/image-reference-1.png",
  title: "First reference image",
  name: "First reference image",
};

export function runVideoMentionAliasTests() {
  const directMention = findPromptMentions("@图片1");
  assert.equal(directMention.length, 1);
  assert.equal(directMention[0].type, "image");
  assert.equal(directMention[0].index, 1);
  assert.equal(directMention[0].token, "【@图1】");

  const spacedMention = findPromptMentions("@图片 1");
  assert.equal(spacedMention.length, 1);
  assert.equal(spacedMention[0].type, "image");
  assert.equal(spacedMention[0].index, 1);

  const bracketMention = findPromptMentions("【@图片1】");
  assert.equal(bracketMention.length, 1);
  assert.equal(bracketMention[0].token, "【@图1】");

  assert.equal(convertVisibleMentionsToTokens("@图片1"), "【@图1】");
  assert.equal(convertVisibleMentionsToTokens("@图片 1"), "【@图1】");
  assert.equal(convertVisibleMentionsToTokens("Use @图片1 for identity."), "Use 【@图1】 for identity.");

  const bindings = getReferencePromptBindings("@图片1 keep the same character.", [firstReadyImage], []);
  assert.equal(bindings.length, 1);
  assert.equal(bindings[0].id, firstReadyImage.id);
  assert.equal(bindings[0].type, "image");
  assert.equal(bindings[0].index, 1);
  assert.equal(bindings[0].token, "【@图1】");
  assert.equal(bindings[0].mention?.token, "【@图1】");
}

if (typeof process !== "undefined" && /video-mentions\.test\.js$/i.test(process.argv[1] || "")) {
  runVideoMentionAliasTests();
  console.log("video-mentions alias tests passed");
}
