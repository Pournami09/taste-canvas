// Client-side helper for uploading images to R2 via presigned URLs.

export type UploadResult = {
  key: string;
};

export async function uploadImageToR2(file: File): Promise<UploadResult> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "pasted-image.png",
      contentType: file.type || "image/png",
      size: file.size,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to get upload URL");
  }

  const { presignedUrl, key } = await res.json();

  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/png" },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Upload to storage failed");
  }

  return { key };
}
