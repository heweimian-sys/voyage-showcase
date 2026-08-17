import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { submissions } from "../../../db/schema";

export const runtime = "edge";

type SubmissionPayload = {
  url?: string;
  wechat?: string;
  group?: string;
  title?: string;
  intro?: string;
  type?: string;
  tags?: unknown;
  coverImage?: string;
  raw?: unknown;
};

function required(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function canonicalSource(urlValue: string) {
  const url = new URL(urlValue);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("作品链接必须使用 http 或 https。");
  }
  url.hash = "";
  url.searchParams.sort();
  return {
    sourceKey: `${url.hostname}${url.pathname}${url.search}`.toLowerCase(),
    url: url.toString(),
  };
}

function persistentImage(value: unknown) {
  const image = required(value);
  if (!image) return "";
  try {
    const url = new URL(image);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.updatedAt), desc(submissions.createdAt))
      .limit(100);
    return Response.json({ ok: true, submissions: rows });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "读取作品失败。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SubmissionPayload;
    const urlValue = required(payload.url);
    const wechat = required(payload.wechat);
    const group = required(payload.group);
    const title = required(payload.title);
    const intro = required(payload.intro);
    const type = payload.type === "热词游戏站" ? "热词游戏站" : "小程序";

    if (!urlValue || !wechat || !group || !title || !intro) {
      return Response.json({ ok: false, error: "作品链接、身份、课程群、标题和简介不能为空。" }, { status: 400 });
    }
    const { sourceKey, url } = canonicalSource(urlValue);

    const tags = Array.isArray(payload.tags)
      ? payload.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 4)
      : [];
    const now = new Date().toISOString();
    const db = await getDb();
    const [existing] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.sourceKey, sourceKey)).limit(1);
    const id = existing?.id ?? crypto.randomUUID();
    const values = {
      id,
      sourceKey,
      url,
      wechat,
      group,
      title,
      intro,
      type,
      tags: JSON.stringify(tags),
      coverImage: persistentImage(payload.coverImage),
      raw: JSON.stringify(payload.raw ?? {}),
      updatedAt: now,
    };

    await db
      .insert(submissions)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({ target: submissions.sourceKey, set: values });

    return Response.json({ ok: true, id, updated: Boolean(existing) }, { status: existing ? 200 : 201 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "保存作品失败。" },
      { status: 500 },
    );
  }
}
