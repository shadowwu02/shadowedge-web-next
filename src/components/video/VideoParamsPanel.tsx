export type VideoParams = {
  duration: number;
  ratio: string;
  quality: string;
  generateAudio: boolean;
};

export function VideoParamsPanel({
  value,
  onChange,
  durations,
  ratios,
  qualities,
}: {
  value: VideoParams;
  onChange: (value: VideoParams) => void;
  durations: number[];
  ratios: string[];
  qualities: string[];
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.055] p-4">
      <h2 className="mb-4 text-sm font-black text-white">Parameters</h2>
      <div className="grid gap-3">
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/40">
          Duration
          <select
            className="rounded-2xl border border-white/10 bg-[#10141f] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-[#ffb44d]/70"
            onChange={(event) => onChange({ ...value, duration: Number(event.target.value) })}
            value={value.duration}
          >
            {durations.map((duration) => (
              <option key={duration} value={duration}>
                {duration}s
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/40">
          Ratio
          <select
            className="rounded-2xl border border-white/10 bg-[#10141f] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-[#ffb44d]/70"
            onChange={(event) => onChange({ ...value, ratio: event.target.value })}
            value={value.ratio}
          >
            {ratios.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/40">
          Quality
          <select
            className="rounded-2xl border border-white/10 bg-[#10141f] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-[#ffb44d]/70"
            onChange={(event) => onChange({ ...value, quality: event.target.value })}
            value={value.quality}
          >
            {qualities.map((quality) => (
              <option key={quality} value={quality}>
                {quality}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white">
          Generate audio
          <input
            checked={value.generateAudio}
            className="size-4 accent-[#ffb44d]"
            onChange={(event) => onChange({ ...value, generateAudio: event.target.checked })}
            type="checkbox"
          />
        </label>
      </div>
    </section>
  );
}
