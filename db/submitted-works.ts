import { desc, eq } from "drizzle-orm";
import type { Work, WorkType } from "../app/data";
import { getDb } from ".";
import { submissions } from "./schema";

function parseTags(value: string) {
  try {
    const tags = JSON.parse(value);
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function toWork(row: typeof submissions.$inferSelect): Work {
  const tags = parseTags(row.tags);
  let qrCode = "";
  try { qrCode = typeof JSON.parse(row.raw)?.qrCode === "string" ? JSON.parse(row.raw).qrCode : ""; } catch {}
  const type: WorkType = row.type === "热词游戏站" ? "热词游戏站" : "小程序";

  return {
    id: row.id,
    title: row.title,
    subtitle: tags.length ? tags.join(" · ") : "船员最新提交",
    maker: row.wechat,
    group: row.group,
    type,
    updatedAt: row.updatedAt.slice(0, 10),
    score: 0,
    url: row.url,
    isWechatMiniProgram: row.url.startsWith("#小程序://"),
    screenshot: row.coverImage || undefined,
    screenshotAlt: row.coverImage ? `${row.title}作品封面` : undefined,
    qrCode: qrCode || undefined,
    stats: ["新提交", tags.length ? `${tags.length}个标签` : "待完善", "D1存储"],
    cover: "map",
    latest: true,
    intro: row.intro,
    highlights: tags.length ? tags : ["船员真实提交", "可进入页面体验"],
  };
}

export async function getSubmittedWorks(limit = 50) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(submissions)
    .orderBy(desc(submissions.updatedAt), desc(submissions.createdAt))
    .limit(limit);
  return rows.map(toWork);
}

export async function getSubmittedWork(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return row ? toWork(row) : null;
}
