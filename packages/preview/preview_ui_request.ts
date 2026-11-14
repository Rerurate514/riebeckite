import type { PreviewUiInput, PreviewUiResponse } from "./src/ui-controller.js";
export async function requestPreview(
  input: PreviewUiInput,
  signal: AbortSignal,
  requestFailure: string,
  endpoint = "/api/playground",
): Promise<PreviewUiResponse | undefined> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new Error("Preview request failed.");
    return (await response.json()) as PreviewUiResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return undefined;
    }
    return {
      html: "",
      diagnostics: [{ severity: "error", message: requestFailure }],
    };
  }
}
