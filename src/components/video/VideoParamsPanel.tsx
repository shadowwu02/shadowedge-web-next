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
    <section className="flex flex-wrap gap-2">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-3 text-xs font-bold text-white/42">
        <span>Duration</span>
          <select
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-white outline-none"
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

      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-3 text-xs font-bold text-white/42">
        <span>Ratio</span>
          <select
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-white outline-none"
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

      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-3 text-xs font-bold text-white/42">
        <span>Quality</span>
          <select
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-white outline-none"
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
    </section>
  );
}
