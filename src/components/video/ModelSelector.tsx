import type { VideoModel } from "@/types/video";

export function ModelSelector({
  models,
  selectedModelId,
  onChange,
}: {
  models: VideoModel[];
  selectedModelId?: string;
  onChange: (model: VideoModel) => void;
}) {
  const selected = models.find((model) => model.id === selectedModelId) || models[0];

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.055] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">Model</h2>
        <span className="rounded-full bg-[#ffb44d]/14 px-3 py-1 text-xs font-bold text-[#ffd08a]">
          {selected?.credits ?? "--"} credits
        </span>
      </div>
      <select
        className="w-full rounded-2xl border border-white/10 bg-[#10141f] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#ffb44d]/70"
        onChange={(event) => {
          const next = models.find((model) => model.id === event.target.value);
          if (next) onChange(next);
        }}
        value={selected?.id || ""}
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>
      {selected ? <p className="mt-3 text-sm leading-6 text-white/55">{selected.desc}</p> : null}
    </section>
  );
}
