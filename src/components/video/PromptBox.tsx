export function PromptBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[.055] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-white">Prompt</h2>
        <span className="text-xs font-bold text-white/38">{value.length}/1200</span>
      </div>
      <textarea
        className="se-scrollbar min-h-48 w-full resize-none rounded-3xl border border-white/10 bg-[#10141f] p-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/28 focus:border-[#ffb44d]/70"
        maxLength={1200}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe the video, camera motion, scene, style, references, and final mood..."
        value={value}
      />
    </section>
  );
}
