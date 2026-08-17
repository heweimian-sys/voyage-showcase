import { and, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { covers, submissions } from "../../../db/schema";

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

type DeletePayload = {
  id?: string;
  wechat?: string;
};

const COVER_ID = /^[a-f0-9]{64}\.(?:webp|jpg|png)$/;
const MINI_PROGRAM_SHARE = /^#小程序:\/\/([^/]+)\/([A-Za-z0-9_-]+)$/;

function required(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function canonicalSource(urlValue: string) {
  const miniProgram = urlValue.trim().match(MINI_PROGRAM_SHARE);
  if (miniProgram) {
    const name = miniProgram[1].trim();
    const code = miniProgram[2];
    return {
      sourceKey: `wechat-mini-program:${name}/${code}`.toLowerCase(),
      url: urlValue.trim(),
    };
  }
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
      .select({
        id: submissions.id,
        url: submissions.url,
        group: submissions.group,
        title: submissions.title,
        intro: submissions.intro,
        type: submissions.type,
        tags: submissions.tags,
        coverImage: submissions.coverImage,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
      })
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
      return Response.json({ ok: false, error: "作品链接、身份、航海群、标题和简介不能为空。" }, { status: 400 });
    }
    const { sourceKey, url } = canonicalSource(urlValue);

    const tags = Array.isArray(payload.tags)
      ? payload.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 4)
      : [];
    const now = new Date().toISOString();
    const db = await getDb();
    const [existing] = await db
      .select({ id: submissions.id, wechat: submissions.wechat })
      .from(submissions)
      .where(eq(submissions.sourceKey, sourceKey))
      .limit(1);
    if (existing && existing.wechat !== wechat) {
      return Response.json(
        { ok: false, error: "该作品链接已由其他身份提交，请使用原身份信息更新。" },
        { status: 403 },
      );
    }
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

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as DeletePayload;
    const id = required(payload.id);
    const wechat = required(payload.wechat);
    if (!id || !wechat) {
      return Response.json({ ok: false, error: "作品和身份信息不能为空。" }, { status: 400 });
    }

    const db = await getDb();
    const [existing] = await db
      .select({ id: submissions.id, wechat: submissions.wechat, coverImage: submissions.coverImage })
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);
    if (!existing || existing.wechat !== wechat) {
      return Response.json({ ok: false, error: "身份信息不匹配，无法删除该作品。" }, { status: 403 });
    }

    await db.delete(submissions).where(and(eq(submissions.id, id), eq(submissions.wechat, wechat)));

    const coverId = coverIdFromUrl(existing.coverImage);
    if (coverId) {
      const [usage] = await db
        .select({ count: sql<number>`count(*)` })
        .from(submissions)
        .where(like(submissions.coverImage, `%/api/covers/${coverId}`));
      if (Number(usage?.count || 0) === 0) {
        await db.delete(covers).where(eq(covers.id, coverId));
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "删除作品失败。" },
      { status: 500 },
    );
  }
}

function coverIdFromUrl(value: string) {
  if (!value) return "";
  try {
    const segments = new URL(value).pathname.split("/");
    const id = segments.at(-1)?.toLowerCase() || "";
    return COVER_ID.test(id) ? id : "";
  } catch {
    return "";
  }
}
