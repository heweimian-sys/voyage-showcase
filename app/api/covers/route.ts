export const runtime = "edge";

const MAX_COVER_BYTES = 400_000;
const ALLOWED_TYPES = new Map([
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "image/webp") {
    return bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  return false;
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "请选择封面图片。" }, { status: 400 });
    }
    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return Response.json({ ok: false, error: "封面只支持 WebP、JPEG 或 PNG。" }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_COVER_BYTES) {
      return Response.json({ ok: false, error: "压缩后的封面不能超过 400KB。" }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!hasValidSignature(bytes, file.type)) {
      return Response.json({ ok: false, error: "图片文件内容与格式不匹配。" }, { status: 415 });
    }

    const digest = hex(await crypto.subtle.digest("SHA-256", buffer));
    const id = `${digest}.${extension}`;
    const { env } = await import("cloudflare:workers");
    await env.DB.prepare(
      "INSERT OR IGNORE INTO covers (id, data, content_type, size) VALUES (?1, ?2, ?3, ?4)",
    ).bind(id, buffer, file.type, file.size).run();

    return Response.json({ ok: true, id, url: `${new URL(request.url).origin}/api/covers/${id}` }, { status: 201 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "封面保存失败。" },
      { status: 500 },
    );
  }
}
