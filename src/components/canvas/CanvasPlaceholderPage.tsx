"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";

export function CanvasPlaceholderPage() {
  const { t } = useI18n();

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-7">
          <p className="se-eyebrow">{t("canvas.eyebrow")}</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#f7f3ea] md:text-4xl">
                {t("canvas.title")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#d6d0c4]/70 md:text-base">{t("canvas.subtitle")}</p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[#ffb44d]/24 bg-[#ffb44d]/10 px-3 py-1.5 text-xs font-semibold text-[#ffcf83]">
              {t("canvas.status")}
            </span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="se-card rounded-[26px] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#ffcf83]">{t("canvas.noteTitle")}</p>
            <p className="mt-3 text-sm leading-6 text-[#d6d0c4]/72">{t("canvas.noteBody")}</p>
          </div>

          <div className="se-card rounded-[26px] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#ffcf83]">{t("canvas.quickLinks")}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link className="se-button-secondary justify-center rounded-2xl px-4 py-3 text-sm font-semibold" href="/workspace/image">
                {t("canvas.createImage")}
              </Link>
              <Link className="se-button-secondary justify-center rounded-2xl px-4 py-3 text-sm font-semibold" href="/workspace/video">
                {t("canvas.createVideo")}
              </Link>
              <Link className="se-button-ghost justify-center rounded-2xl px-4 py-3 text-sm font-semibold" href="/history">
                {t("canvas.viewHistory")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
