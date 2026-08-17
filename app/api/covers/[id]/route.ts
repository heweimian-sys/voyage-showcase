export const runtime = "edge";

const COVER_ID = /^[a-f0-9]{64}\.(?:webp|jpg|png)$/;

type CoverRow = {
  data: ArrayBuffer;
  content_type: string;
  size: number;
};

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = String(params.id || "").toLowerCase();
  if (!COVER_ID.test(id)) return new Response("Not found", { status: 404 });

  const { env } = await import("cloudflare:workers");
  const row = await env.DB.prepare(
    "SELECT data, content_type, size FROM covers WHERE id = ?1 LIMIT 1",
  ).bind(id).first<CoverRow>();
  if (!row) return new Response("Not found", { status: 404 });

  return new Response(row.data, {
    headers: {
      "content-type": row.content_type,
      "content-length": String(row.size),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
