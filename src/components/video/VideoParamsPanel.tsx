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
    <section className="rounded-[22px] border border-white/10 bg-white/[.055] p-3">
      <h2 className="mb-2 text-sm font-black text-white">Settings</h2>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.12em] text-white/40">
          Duration
          <select
            className="min-w-0 rounded-2xl border border-white/10 bg-[#10141f] px-2 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#ffb44d]/70"
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

        <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.12em] text-white/40">
          Ratio
          <select
            className="min-w-0 rounded-2xl border border-white/10 bg-[#10141f] px-2 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#ffb44d]/70"
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

        <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.12em] text-white/40">
          Quality
          <select
            className="min-w-0 rounded-2xl border border-white/10 bg-[#10141f] px-2 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#ffb44d]/70"
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
      </div>
    </section>
  );
}
