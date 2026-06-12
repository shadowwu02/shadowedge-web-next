"use client";

import { useCallback } from "react";
import { ImageHistoryPanel } from "@/components/image/ImageHistoryPanel";
import { ImageOutputDetailPanel } from "@/components/image/ImageOutputDetailPanel";
import { ImageOutputStage } from "@/components/image/ImageOutputStage";
import { ImagePromptPanel } from "@/components/image/ImagePromptPanel";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { isImageActiveStatus } from "@/lib/image/imageHistoryUtils";
import type { ImageHistoryItem } from "@/types/image";

export function ImageWorkspace() {
  const image = useImageGeneration();
  const displayJob = image.currentJob || image.outputs[0] || null;

  const handleHistorySelect = useCallback((item: ImageHistoryItem) => {
    image.selectJob(item);
    if (isImageActiveStatus(item.status)) {
      void image.refreshStatus(item.dbJobId || item.jobId);
    }
  }, [image]);

  const handleRefreshStatus = useCallback((jobId: string) => {
    void image.refreshStatus(jobId);
  }, [image]);

  return (
    <div className="se-scrollbar grid h-full min-h-0 gap-4 overflow-y-auto overflow-x-hidden xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(300px,380px)] xl:overflow-hidden">
      <div className="min-h-[760px] overflow-hidden xl:min-h-0">
        <ImagePromptPanel
          error={image.error}
          estimatedCredits={image.estimatedCredits}
          isActiveJob={Boolean(image.currentJob && isImageActiveStatus(image.currentJob.status))}
          isGenerating={image.isGenerating}
          isPolling={image.isPolling}
          loadingModels={image.loadingModels}
          models={image.models}
          onGenerate={() => void image.submit()}
          onPromptChange={image.setPrompt}
          onRemoveReference={image.removeReference}
          onSelectModel={image.setSelectedModelId}
          onUpdateParams={image.setParams}
          onUploadReference={(file) => void image.uploadReferenceFile(file)}
          params={image.params}
          prompt={image.prompt}
          references={image.references}
          selectedModel={image.selectedModel}
        />
      </div>

      <div className="min-h-[560px] overflow-hidden xl:min-h-0">
        <ImageOutputStage
          error={image.error}
          isGenerating={image.isGenerating}
          isPolling={image.isPolling}
          job={displayJob}
          onRefresh={handleRefreshStatus}
          recoveredJobId={image.recoveredJobId}
        />
      </div>

      <div className="se-scrollbar flex min-h-[620px] flex-col gap-4 overflow-y-auto xl:min-h-0">
        <ImageHistoryPanel
          currentJobId={displayJob?.dbJobId || displayJob?.jobId}
          history={image.history}
          error={image.error}
          isLoading={image.loadingHistory}
          onRefreshHistory={() => void image.reloadHistory()}
          onRefreshStatus={handleRefreshStatus}
          onSelect={handleHistorySelect}
        />
        <ImageOutputDetailPanel job={displayJob} />
      </div>
    </div>
  );
}
