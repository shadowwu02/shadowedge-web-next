"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { saveAssetFromJob } from "@/lib/assets-api";
import { ApiError } from "@/types/api";

type SaveStatus = "idle" | "saving" | "saved" | "existing" | "auth" | "error";

type SaveToAssetsButtonProps = {
  className?: string;
  disabled?: boolean;
  displayName?: string;
  jobId?: string | null;
  kind: "image" | "video";
  outputUrl?: string | null;
};

function getStatusLabel(status: SaveStatus, t: ReturnType<typeof useI18n>["t"]) {
  if (status === "saving") return t("assets.save.saving");
  if (status === "saved") return t("assets.save.saved");
  if (status === "existing") return t("assets.save.alreadySaved");
  if (status === "auth") return t("assets.save.signInRequired");
  if (status === "error") return t("assets.save.failed");
  return t("assets.save.action");
}

export function SaveToAssetsButton({
  className = "",
  disabled = false,
  displayName,
  jobId,
  kind,
  outputUrl,
}: SaveToAssetsButtonProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const cleanJobId = String(jobId || "").trim();
  const cleanOutputUrl = String(outputUrl || "").trim();
  const isTerminal = status === "saved" || status === "existing";
  const isDisabled = disabled || !cleanJobId || !cleanOutputUrl || status === "saving" || isTerminal;

  if (!cleanJobId || !cleanOutputUrl) return null;

  const handleSave = async () => {
    setStatus("saving");

    try {
      const result = await saveAssetFromJob(cleanJobId, {
        displayName,
        kind,
        outputUrl: cleanOutputUrl,
      });
      setStatus(result.alreadyExists ? "existing" : "saved");
    } catch (error) {
      if (error instanceof ApiError && (error.kind === "auth" || error.status === 401)) {
        setStatus("auth");
        return;
      }

      setStatus("error");
    }
  };

  return (
    <button
      className={className}
      disabled={isDisabled}
      onClick={(event) => {
        event.stopPropagation();
        void handleSave();
      }}
      title={getStatusLabel(status, t)}
      type="button"
    >
      {getStatusLabel(status, t)}
    </button>
  );
}
