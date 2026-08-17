export const runtime = "edge";

type InspectPayload = {
  url?: string;
};

type MiniProgramShare = {
  name: string;
  code: string;
  raw: string;
};

type MetaMap = Record<string, string>;

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 9_000;
const MAX_REDIRECTS = 3;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^\[?::1\]?$/i,
  /\.local$/i,
  /\.internal$/i,
];

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers || {}),
    },
  });
}

function normalizeUrl(input: string, base?: string) {
  const url = new URL(input, base);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("只支持 http 或 https 链接。微信小程序路径需要船员手动补充信息。");
  }
  url.hash = "";
  validateSafeUrl(url);
  return url;
}

function parseMiniProgramShare(input: string): MiniProgramShare | null {
  const normalized = input.trim().replace(/[\r\n]+/g, "");
  const match = normalized.match(/^#小程序:\/\/([^/]+)\/([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  return { name: match[1].trim(), code: match[2], raw: normalized };
}

function buildMiniProgramInspection(share: MiniProgramShare) {
  const intro = `${share.name}微信小程序，提交后可在微信中打开体验。`;
  return {
    kind: "wechat-mini-program" as const,
    finalUrl: share.raw,
    redirected: false,
    raw: {
      title: share.name,
      h1: share.name,
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      favicon: "",
      mainText: `微信小程序：${share.name}`,
    },
    generated: {
      title: share.name.slice(0, 48),
      intro,
      type: "小程序" as const,
      tags: ["小程序"],
      coverMode: "manual-required" as const,
      coverImage: "",
      imageCandidates: [],
    },
  };
}

function validateSafeUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  if (!host || PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    throw new Error("该链接指向本机、内网或不可访问地址，已拦截。");
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map(Number);
    if (
      parts[0] === 10 ||
      parts[0] === 127 ||
      parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    ) {
      throw new Error("该 IP 属于内网或本机地址，已拦截。");
    }
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function cleanText(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteMaybe(value: string | undefined, base: string) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function extractAttr(tag: string, attr: string) {
  const pattern = new RegExp(`${attr}\\s*=\\s*([\"'])(.*?)\\1`, "i");
  return tag.match(pattern)?.[2]?.trim() || "";
}

function extractMeta(html: string) {
  const meta: MetaMap = {};
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = extractAttr(tag, "property") || extractAttr(tag, "name");
    const content = extractAttr(tag, "content");
    if (key && content) meta[key.toLowerCase()] = decodeEntities(content);
  }
  return meta;
}

function extractImages(html: string, baseUrl: string) {
  const candidates: string[] = [];
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgTags.slice(0, 16)) {
    const src = extractAttr(tag, "src") || extractAttr(tag, "data-src") || extractAttr(tag, "data-original");
    const absolute = absoluteMaybe(src, baseUrl);
    if (absolute && !candidates.includes(absolute)) candidates.push(absolute);
  }
  return candidates;
}

function pickMainText(html: string) {
  const main =
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<body[\s\S]*?<\/body>/i)?.[0] ||
    html;
  return cleanText(main).slice(0, 900);
}

function clampChineseIntro(text: string, fallbackTitle: string) {
  const cleaned = cleanText(text).replace(/[。！？!?]\s*/g, "，");
  const source = cleaned || `${fallbackTitle}的作品展示页面`;
  const shortened = source.length > 42 ? source.slice(0, 40).replace(/[，,、：:；;]$/g, "") : source;
  return shortened.length < 20 ? `${shortened}，可进入页面查看真实体验` : shortened;
}

function inferType(text: string): "小程序" | "热词游戏站" {
  const haystack = text.toLowerCase();
  if (/(热词|闯关|游戏|挑战|答题|quiz|game|word)/i.test(haystack)) return "热词游戏站";
  return "小程序";
}

function inferTags(text: string, type: string) {
  const rules: Array<[RegExp, string]> = [
    [/热词|热点|词库/, "热词"],
    [/游戏|闯关|挑战|答题/, "互动玩法"],
    [/记录|打卡|日志/, "成长记录"],
    [/工具|管理|效率|自动化/, "实用工具"],
    [/数据|统计|图表/, "数据看板"],
    [/小程序|微信/, "小程序"],
    [/学习|课程|知识/, "学习"],
  ];
  const tags = new Set<string>([type]);
  for (const [pattern, tag] of rules) {
    if (pattern.test(text)) tags.add(tag);
    if (tags.size >= 4) break;
  }
  return [...tags].slice(0, 4);
}

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > MAX_BYTES) {
        throw new Error("目标页面内容过大，已停止读取。");
      }
      chunks.push(value);
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(
    chunks.reduce((all, chunk) => {
      const next = new Uint8Array(all.length + chunk.length);
      next.set(all);
      next.set(chunk, all.length);
      return next;
    }, new Uint8Array()),
  );
}

async function safeFetchHtml(initialUrl: URL) {
  let current = initialUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    validateSafeUrl(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);
    try {
      const response = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "ShengcaiVoyageBot/1.0 (+https://chatgpt.com)",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("目标页面重定向但没有返回新地址。");
        current = normalizeUrl(location, current.toString());
        continue;
      }
      if (!response.ok) {
        throw new Error(`目标页面返回 ${response.status}，暂时无法读取。`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        throw new Error("目标链接不是可解析的网页 HTML。");
      }
      const html = await readLimitedText(response);
      return { html, finalUrl: current.toString(), redirected: current.toString() !== initialUrl.toString() };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("目标页面加载超时。");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("目标页面重定向次数过多，已停止读取。");
}

function buildInspection(html: string, finalUrl: string) {
  const meta = extractMeta(html);
  const titleTag = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const h1 = cleanText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const mainText = pickMainText(html);
  const title = meta["og:title"] || meta["twitter:title"] || h1 || titleTag || "未命名作品";
  const description =
    meta["og:description"] ||
    meta["twitter:description"] ||
    meta.description ||
    mainText.slice(0, 120);
  const images = [
    absoluteMaybe(meta["og:image"] || meta["twitter:image"], finalUrl),
    ...extractImages(html, finalUrl),
  ].filter(Boolean);
  const uniqueImages = [...new Set(images)].slice(0, 6);
  const favicon =
    absoluteMaybe(html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)["']/i)?.[1], finalUrl) ||
    absoluteMaybe("/favicon.ico", finalUrl);
  const combined = `${title} ${description} ${mainText}`;
  const type = inferType(combined);
  const intro = clampChineseIntro(description || mainText, title);

  return {
    finalUrl,
    raw: {
      title: titleTag,
      h1,
      metaDescription: meta.description || "",
      ogTitle: meta["og:title"] || "",
      ogDescription: meta["og:description"] || "",
      ogImage: meta["og:image"] || "",
      favicon,
      mainText: mainText.slice(0, 500),
    },
    generated: {
      title: title.slice(0, 48),
      intro,
      type,
      tags: inferTags(combined, type),
      coverMode: uniqueImages.length ? "image-template" : "manual-required",
      coverImage: uniqueImages[0] || "",
      imageCandidates: uniqueImages,
    },
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as InspectPayload;
    const rawUrl = String(payload.url || "").trim();
    if (!rawUrl) return json({ ok: false, error: "请先填写作品体验链接。" }, { status: 400 });
    const miniProgramShare = parseMiniProgramShare(rawUrl);
    if (miniProgramShare) {
      return json({ ok: true, ...buildMiniProgramInspection(miniProgramShare) });
    }
    if (/^(wx|weixin|pages\/|\/pages)/i.test(rawUrl)) {
      return json(
        {
          ok: false,
          error: "微信内部链接或小程序路径无法由服务器直接打开，请手动补充作品信息和封面。",
          reason: "wechat-link",
        },
        { status: 422 },
      );
    }
    const url = normalizeUrl(rawUrl);
    const { html, finalUrl, redirected } = await safeFetchHtml(url);
    const inspection = buildInspection(html, finalUrl);
    return json({ ok: true, redirected, ...inspection });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取失败，请补充信息。",
      },
      { status: 400 },
    );
  }
}
