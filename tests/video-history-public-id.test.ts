import { describe, expect, it } from "vitest";

import { getPublicVideoJobLabel, getSafeVideoHistoryView } from "@/lib/video/historyUtils";
import type { VideoTaskRecord } from "@/types/video";

describe("video history public job identity", () => {
  it("prefers the canonical database job id over a provider-qualified tracking id", () => {
    const view = getSafeVideoHistoryView({
      dbJobId: "dc5d6d7f-6063-4801-891a-7c4a85a1cc6b",
      jobId: "xinhankr:cgt-20260813133124-pptwy",
      providerJobId: "xinhankr:cgt-20260813133124-pptwy",
      status: "completed",
    } as VideoTaskRecord);

    expect(view.jobLabel).toBe("dc5d6d7f-6063-4801-891a-7c4a85a1cc6b");
  });

  it("removes a provider namespace when only the provider tracking id exists", () => {
    expect(getPublicVideoJobLabel("xinhankr:cgt-20260813133124-pptwy")).toBe("cgt-20260813133124-pptwy");
  });
});
