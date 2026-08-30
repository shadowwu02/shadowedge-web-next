import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { mediaAssetToUploadMediaItem } from "@/lib/assets-api";
import {
  getPrivateCanonicalAudioReferenceUrl,
  getMediaUploadErrorDisplayKeys,
  normalizeMediaAsset,
} from "@/lib/media-assets";
import {
  createCanonicalUploadedMediaItem,
  reconcileUploadPickerMedia,
} from "@/lib/video/videoAudioUploadPersistence";
import {
  configureAudioUploadContract,
  validateAudioUploadFile,
} from "@/lib/video/audioUploadContract";
import { normalizeUploadResponse } from "@/lib/video-api";
import type { UploadMediaItem } from "@/types/video";

const ASSET_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const TENANT_ID = "33333333-3333-4333-8333-333333333333";

function uploadedAudio(patch: Partial<UploadMediaItem> = {}): UploadMediaItem {
  return {
    id: ASSET_ID,
    assetId: ASSET_ID,
    canonicalReferenceStatus: "CANONICAL",
    duration: 5,
    mimeType: "audio/wav",
    name: "safe-smoke-b-simple-tone-v2.wav",
    privateReference: true,
    source: "current_upload",
    type: "audio",
    uploadStatus: "ready",
    url: getPrivateCanonicalAudioReferenceUrl(ASSET_ID),
    ...patch,
  };
}

describe("video audio upload persistence", () => {
  it("normalizes all certified WAV browser MIME variants without changing MP3/M4A upload support", () => {
    configureAudioUploadContract({
      version: "video_audio_upload_v1",
      extensions: [".mp3", ".wav", ".m4a"],
      mimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave", "audio/mp4", "audio/x-m4a"],
    });

    for (const mimeType of ["audio/wav", "audio/x-wav", "audio/wave"]) {
      expect(validateAudioUploadFile({ name: "safe-smoke-b-simple-tone-v2.wav", type: mimeType })).toBe("");
    }
    expect(validateAudioUploadFile({ name: "voice.mp3", type: "audio/mpeg" })).toBe("");
    expect(validateAudioUploadFile({ name: "voice.m4a", type: "audio/mp4" })).toBe("");
  });

  it("normalizes a successful private WAV response to a stable authenticated canonical URL", () => {
    const response = normalizeUploadResponse({
      data: {
        assetId: ASSET_ID,
        filename: "safe-smoke-b-simple-tone-v2.wav",
        mimetype: "audio/wav",
        originalname: "safe-smoke-b-simple-tone-v2.wav",
        privateReference: true,
        type: "audios",
      },
    });

    expect(response.assetId).toBe(ASSET_ID);
    expect(response.privateReference).toBe(true);
    expect(response.type).toBe("audio");
    expect(response.url).toBe(getPrivateCanonicalAudioReferenceUrl(ASSET_ID));
  });

  it("keeps canonical private audio normalizable without a public URL", () => {
    const normalized = normalizeMediaAsset({
      assetId: ASSET_ID,
      id: ASSET_ID,
      mimeType: "audio/wav",
      name: "safe-smoke-b-simple-tone-v2.wav",
      privateReference: true,
      status: "ready",
      type: "audio",
    });

    expect(normalized?.assetId).toBe(ASSET_ID);
    expect(normalized?.privateReference).toBe(true);
    expect(normalized?.url).toBe(getPrivateCanonicalAudioReferenceUrl(ASSET_ID));
  });

  it("atomically replaces the transient WAV item with the canonical READY identity", () => {
    const transient = uploadedAudio({
      assetId: undefined,
      canonicalReferenceStatus: undefined,
      file: { name: "safe-smoke-b-simple-tone-v2.wav" } as File,
      id: "local-audio",
      privateReference: false,
      uploadStatus: "uploading",
      url: "",
    });
    const canonical = createCanonicalUploadedMediaItem(transient, {
      assetId: ASSET_ID,
      duration: 5,
      id: ASSET_ID,
      mimeType: "audio/wav",
      name: "safe-smoke-b-simple-tone-v2.wav",
      privateReference: true,
      type: "audio",
      url: getPrivateCanonicalAudioReferenceUrl(ASSET_ID),
    });

    expect(canonical.id).toBe(ASSET_ID);
    expect(canonical.assetId).toBe(ASSET_ID);
    expect(canonical.file).toBeUndefined();
    expect(canonical.uploadStatus).toBe("ready");
    expect(canonical.url).toBe(getPrivateCanonicalAudioReferenceUrl(ASSET_ID));
  });

  it("keeps a current authenticated upload visible while stale authority excludes unrelated cached media", () => {
    const current = uploadedAudio();
    const staleCached = uploadedAudio({
      assetId: "44444444-4444-4444-8444-444444444444",
      id: "44444444-4444-4444-8444-444444444444",
      source: "local_upload_cache",
    });
    const reconciled = reconcileUploadPickerMedia({
      currentMedia: [current],
      localMedia: [staleCached],
      reusableMedia: [],
      workspaceAuthority: {
        checkedAt: Date.now(),
        media: [],
        scope: { tenantId: TENANT_ID, userId: USER_ID },
      },
    });

    expect(reconciled.map((item) => item.assetId)).toEqual([ASSET_ID]);
  });

  it("keeps failed transient audio visible for productized retry feedback", () => {
    const failed = uploadedAudio({
      assetId: undefined,
      errorMessage: "AUDIO_UPLOAD_R2_NOT_CONFIGURED",
      id: "failed-local-audio",
      privateReference: false,
      uploadStatus: "failed",
      url: "",
    });
    const reconciled = reconcileUploadPickerMedia({
      currentMedia: [failed],
      localMedia: [],
      reusableMedia: [],
      workspaceAuthority: {
        checkedAt: Date.now(),
        media: [],
        scope: { tenantId: TENANT_ID, userId: USER_ID },
      },
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].uploadStatus).toBe("failed");
    expect(getMediaUploadErrorDisplayKeys(reconciled[0].errorMessage, { fallbackKind: "upload" }).messageKey)
      .toBe("media.upload.failedMessage");
  });

  it("maps a listed private Audio Asset without requiring a model-specific public presentation", () => {
    const item = mediaAssetToUploadMediaItem({
      id: ASSET_ID,
      type: "audio",
      status: "ready",
      filename: "safe-smoke-b-simple-tone-v2.wav",
      mimeType: "audio/wav",
      privateReference: true,
    });

    expect(item?.assetId).toBe(ASSET_ID);
    expect(item?.url).toBe(getPrivateCanonicalAudioReferenceUrl(ASSET_ID));
  });

  it("always loads the model-independent Asset Library while preserving International presentations", () => {
    const picker = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "video", "MediaPickerDrawer.tsx"),
      "utf8",
    );
    expect(picker).toContain('const baseRequest = listMediaAssets({ limit: 100, status: "ready" });');
    expect(picker).toContain('listMediaAssets({ limit: 100, status: "ready", model: modelRule.modelId })');
    expect(picker).toContain("results.flatMap((result) => result.assets)");
  });
});
