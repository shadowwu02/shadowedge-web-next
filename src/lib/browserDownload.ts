type BrowserDownloadOptions = {
  documentObject?: Document;
  fetcher?: typeof fetch;
  filename: string;
  headers?: HeadersInit;
  url: string;
  urlApi?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
};

export async function downloadBrowserFile({
  documentObject = document,
  fetcher = fetch,
  filename,
  headers,
  url,
  urlApi = URL,
}: BrowserDownloadOptions) {
  const safeUrl = String(url || "").trim();
  if (!/^https?:\/\//i.test(safeUrl)) throw new Error("DOWNLOAD_URL_INVALID");

  const response = await fetcher(safeUrl, {
    credentials: "omit",
    headers,
    method: "GET",
  });
  if (!response.ok) throw new Error(`DOWNLOAD_REQUEST_FAILED_${response.status}`);

  const blob = await response.blob();
  const objectUrl = urlApi.createObjectURL(blob);
  const anchor = documentObject.createElement("a");
  anchor.download = filename;
  anchor.href = objectUrl;
  anchor.rel = "noreferrer";
  anchor.style.display = "none";
  documentObject.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    globalThis.setTimeout(() => urlApi.revokeObjectURL(objectUrl), 0);
  }
}
