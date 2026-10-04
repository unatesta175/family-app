/**
 * Shrinks a picked image to a small JPEG data: URL (for the vision board) so it can live in the
 * database. Client-side only. Throws if the file isn't an image or can't be made small enough.
 */
export async function fileToDataUrl(file: File, maxSide = 720): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.78, 0.65, 0.5, 0.38]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= 400_000) return url;
  }
  throw new Error("That image is too large. Try a smaller one.");
}
