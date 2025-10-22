// Lightweight client-side image normalization helpers.
// - Converts HEIC/HEIF images to JPEG for broader compatibility
// - Passes through GIF/PNG/JPEG/WEBP as-is

type Normalized = { file: File; ext: string; contentType: string };

function getExtFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext;
}

export async function normalizeImageFile(input: File): Promise<Normalized> {
  const name = input.name || "upload";
  const ext = getExtFromName(name);
  const type = (input.type || "").toLowerCase();
  const isHeic = type === "image/heic" || type === "image/heif" || ext === "heic" || ext === "heif";

  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default as (opts: { blob: Blob; toType: string; quality?: number }) => Promise<Blob>;
      const jpegBlob = await heic2any({ blob: input, toType: "image/jpeg", quality: 0.8 });
      const outName = name.replace(/\.(heic|heif)$/i, ".jpg");
      const file = new File([jpegBlob], outName, { type: "image/jpeg" });
      return { file, ext: "jpg", contentType: "image/jpeg" };
    } catch {
      // If conversion fails, fall back to original file but label as octet-stream
      return { file: input, ext: ext || "bin", contentType: type || "application/octet-stream" };
    }
  }

  // Allow GIFs to pass through unchanged (to retain animation)
  if (type === "image/gif" || ext === "gif") {
    return { file: input, ext: "gif", contentType: "image/gif" };
  }

  // Common pass-through formats
  if (type === "image/jpeg" || ext === "jpg" || ext === "jpeg") {
    return { file: input, ext: "jpg", contentType: "image/jpeg" };
  }
  if (type === "image/png" || ext === "png") {
    return { file: input, ext: "png", contentType: "image/png" };
  }
  if (type === "image/webp" || ext === "webp") {
    return { file: input, ext: "webp", contentType: "image/webp" };
  }

  // Default: pass-through with original type
  return { file: input, ext: ext || "img", contentType: type || "application/octet-stream" };
}


