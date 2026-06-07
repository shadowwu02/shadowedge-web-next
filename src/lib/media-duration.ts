export function getAudioDuration(file: File): Promise<number> {
  if (!file.type.startsWith("audio/")) return Promise.resolve(0);

  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    let done = false;

    function finish(duration = 0) {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      resolve(Number.isFinite(duration) ? duration : 0);
    }

    const timer = window.setTimeout(() => finish(0), 3500);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish(audio.duration || 0);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      finish(0);
    };
    audio.src = url;
  });
}
