"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../components";
import type { WorkType } from "../data";

type InspectStatus = "idle" | "reading" | "cover" | "success" | "error";

type GeneratedWork = {
  title: string;
  intro: string;
  type: WorkType;
  tags: string[];
  coverMode: "image-template" | "manual-required";
  coverImage: string;
  imageCandidates: string[];
};

type InspectPreview = {
  kind?: "webpage" | "wechat-mini-program";
  finalUrl: string;
  redirected?: boolean;
  raw?: {
    title?: string;
    h1?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    favicon?: string;
    mainText?: string;
    qrCode?: string;
  };
  generated: GeneratedWork;
};

const statusText: Record<InspectStatus, string> = {
  idle: "填写链接后，点击读取作品信息。",
  reading: "正在读取作品",
  cover: "正在生成封面",
  success: "读取成功，请预览确认后提交。",
  error: "无法读取，请补充信息。",
};

function normalizeTags(value: string) {
  return value
    .split(/[,\s，、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function fallbackPreview(url: string): InspectPreview {
  return {
    finalUrl: url,
    generated: {
      title: "",
      intro: "",
      type: "小程序",
      tags: ["小程序"],
      coverMode: "manual-required",
      coverImage: "",
      imageCandidates: [],
    },
  };
}

export default function SubmitPage() {
  const [wechat, setWechat] = useState("");
  const [group, setGroup] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<InspectPreview | null>(null);
  const [status, setStatus] = useState<InspectStatus>("idle");
  const [notice, setNotice] = useState("先粘贴链接即可识别；航海群和微信昵称可以在提交前补充，也可以稍后完善。");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  const tagInput = useMemo(() => preview?.generated.tags.join("，") || "", [preview]);

  async function readWorkInfo() {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setStatus("error");
      setNotice("请先粘贴作品体验链接或微信小程序分享文本。");
      setPreview(fallbackPreview(cleanUrl));
      return;
    }

    setSaved(false);
    setStatus("reading");
    setNotice("正在通过服务端读取网页内容，不在浏览器前端跨域抓取目标网站。");

    try {
      const response = await fetch("/api/inspect-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const result = (await response.json()) as InspectPreview & { ok: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "读取失败，请补充信息。");
      }

      setStatus("cover");
      setNotice(result.kind === "wechat-mini-program"
        ? "已识别微信小程序分享文本，已自动填入名称和默认简介。"
        : "已读取网页标题、描述和图片，正在套入作品舱封面模板。");

      setPreview({
        finalUrl: result.finalUrl,
        redirected: result.redirected,
        raw: result.raw,
        generated: result.generated,
      });
      setManualFile(null);
      window.setTimeout(() => {
        setStatus("success");
        setNotice(result.redirected ? "读取成功：链接存在跳转，已使用最终跳转地址生成预览。" : statusText.success);
      }, 280);
    } catch (error) {
      setStatus("error");
      setNotice(error instanceof Error ? error.message : statusText.error);
      setPreview(fallbackPreview(cleanUrl));
      setManualFile(null);
    }
  }

  function updateGenerated(patch: Partial<GeneratedWork>) {
    setPreview((current) => current ? { ...current, generated: { ...current.generated, ...patch } } : current);
  }

  function handleManualImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12_000_000) {
      setStatus("error");
      setNotice("请选择 12MB 以内的图片文件。");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setManualFile(file);
    updateGenerated({ coverImage: localUrl, coverMode: "image-template" });
  }

  function handleQrImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12_000_000) { setStatus("error"); setNotice("请选择 12MB 以内的小程序码图片。"); return; }
    setQrFile(file);
    setNotice("已添加小程序码，提交后会在作品详情页展示。");
  }

  async function compressCover(file: File) {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / image.width, 1200 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理封面图片。");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();

    for (const quality of [0.82, 0.7, 0.58, 0.46]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= 400_000) return blob;
    }
    throw new Error("图片压缩后仍超过 400KB，请选择更简单或更小的图片。");
  }

  function regenerateCover() {
    if (!preview) return;
    setStatus("cover");
    setNotice("已根据当前标题、类型和选中主视觉重新生成封面预览。");
    window.setTimeout(() => setStatus("success"), 220);
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      setStatus("error");
      setNotice("请先点击“读取作品信息”，预览确认后再提交。");
      return;
    }
    if (!preview.finalUrl.trim()) {
      setStatus("error");
      setNotice("作品链接不能为空。");
      return;
    }
    if (!preview.generated.title.trim() || !preview.generated.intro.trim()) {
      setStatus("error");
      setNotice("当前页面缺少标题或简介，请补充后再确认提交。");
      return;
    }

    const submission = {
      url: preview.finalUrl,
      wechat: wechat.trim(),
      group: group.trim(),
      title: preview.generated.title.trim(),
      intro: preview.generated.intro.trim(),
      type: preview.generated.type,
      tags: preview.generated.tags,
      coverImage: preview.generated.coverImage,
      raw: preview.raw,
    };

    setSaved(false);
    setStatus("reading");
    setNotice("正在保存到作品舱数据库。");
    try {
      if (manualFile) {
        setNotice("正在压缩并保存封面图片。");
        const compressed = await compressCover(manualFile);
        const form = new FormData();
        form.append("file", new File([compressed], "cover.webp", { type: "image/webp" }));
        const uploadResponse = await fetch("/api/covers", { method: "POST", body: form });
        const upload = (await uploadResponse.json()) as { ok: boolean; error?: string; url?: string };
        if (!uploadResponse.ok || !upload.ok || !upload.url) throw new Error(upload.error || "封面保存失败。");
        submission.coverImage = upload.url;
      }
      if (qrFile) {
        const form = new FormData();
        form.append("file", new File([qrFile], "mini-program-code.png", { type: qrFile.type }));
        const uploadResponse = await fetch("/api/covers", { method: "POST", body: form });
        const upload = (await uploadResponse.json()) as { ok: boolean; error?: string; url?: string };
        if (!uploadResponse.ok || !upload.ok || !upload.url) throw new Error(upload.error || "小程序码保存失败。");
        submission.raw = { ...(submission.raw || {}), qrCode: upload.url };
      }

      setNotice("正在保存到作品舱数据库。");
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(submission),
      });
      const result = (await response.json()) as { ok: boolean; error?: string; updated?: boolean; id?: string; manageToken?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "保存作品失败。");
      setStatus("success");
      setSaved(true);
      if (result.id && result.manageToken) localStorage.setItem(`voyage:manage:${result.id}`, result.manageToken);
      setNotice(result.updated ? "更新成功：同一作品已按链接更新为最新版本。" : "提交成功：作品已保存到作品舱数据库。");
    } catch (error) {
      setStatus("error");
      setNotice(error instanceof Error ? error.message : "保存作品失败，请稍后重试。");
    }
  }

  return (
    <main>
      <SiteHeader />
      <section className="submit-page submit-flow-page">
        <div className="submit-copy">
          <span className="eyebrow">提交作品</span>
          <h1>提交你的作品</h1>
          <p>网页作品会自动读取标题和主视觉；微信小程序只需粘贴分享文本，系统会自动识别名称，确认后即可先提交，资料可后续完善。</p>
          <div className="submit-steps">
            <div><span>01</span><strong>微信身份确认</strong><small>识别同一位船员</small></div>
            <div><span>02</span><strong>读取作品信息</strong><small>从链接提取标题、介绍和主视觉</small></div>
            <div><span>03</span><strong>保存最新体验链接</strong><small>多次提交按最新结果展示</small></div>
          </div>
        </div>

        <form className={`submit-modal inline ${status}`} onSubmit={handleConfirm}>
          <div className={`fetch-status ${status}`} role="status" aria-live="polite">
            <span />
            {statusText[status]}
          </div>

          <label>
            作品体验链接
            <input
              name="url"
              placeholder="例如：https://example.com/work"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              inputMode="url"
            />
            <small>支持 http/https 网页链接，也支持微信小程序分享文本，例如：#小程序://轻松秒记账/0gKUWDjSJoGl97A</small>
          </label>
          <label>
            所属航海群
            <input name="group" placeholder="例如：生财有术第 88 期" value={group} onChange={(event) => setGroup(event.target.value)} />
          </label>
          <label>
            微信昵称 / 身份信息
            <input name="wechat" placeholder="用于识别同一位船员" value={wechat} onChange={(event) => setWechat(event.target.value)} />
          </label>
          <label className="manual-upload">
            小程序码（推荐上传）
            <input type="file" accept="image/*" onChange={(event) => handleQrImage(event.target.files?.[0])} />
            <small>用户可以在微信中扫码体验；网站会把它展示在详情页。</small>
          </label>

          <button className="secondary-action" type="button" onClick={readWorkInfo} disabled={status === "reading" || status === "cover"}>
            {status === "reading" || status === "cover" ? "读取中…" : "读取作品信息"}
          </button>

          {preview && (
            <section className="preview-card" aria-label="作品提交预览">
              <div className="preview-head">
                <strong>提交前预览</strong>
                {preview.redirected && <span>已使用最终跳转链接</span>}
              </div>

              <div
                className={`cover-preview ${preview.generated.coverImage ? "has-image" : ""}`}
                style={preview.generated.coverImage ? { backgroundImage: `url(${preview.generated.coverImage})` } : undefined}
              >
                <div className="cover-preview-content">
                  <span>{preview.generated.type}</span>
                  <strong>{preview.generated.title || "请补充作品名称"}</strong>
                  <small>{preview.generated.intro || "请补充一句话介绍"}</small>
                </div>
              </div>

              {preview.generated.imageCandidates.length > 0 ? (
                <div className="image-picker">
                  <span>选择主视觉</span>
                  <div>
                    {preview.generated.imageCandidates.map((image) => (
                      <button
                        className={preview.generated.coverImage === image ? "active" : ""}
                        type="button"
                        key={image}
                        onClick={() => updateGenerated({ coverImage: image, coverMode: "image-template" })}
                        aria-label="选择这张主视觉"
                      >
                        <img src={image} alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <label className="manual-upload">
                  目标页面没有可用图片，请手动上传封面
                  <input type="file" accept="image/*" onChange={(event) => handleManualImage(event.target.files?.[0])} />
                </label>
              )}

              <label>
                作品名称
                <input value={preview.generated.title} onChange={(event) => updateGenerated({ title: event.target.value })} placeholder="系统未识别时请补充" />
              </label>
              <label>
                一句话介绍
                <textarea value={preview.generated.intro} onChange={(event) => updateGenerated({ intro: event.target.value })} placeholder="20—40 字，基于真实作品内容" rows={3} />
              </label>
              <label>
                作品类型
                <select value={preview.generated.type} onChange={(event) => updateGenerated({ type: event.target.value as WorkType })}>
                  <option>小程序</option>
                  <option>热词游戏站</option>
                </select>
              </label>
              <label>
                内容标签
                <input value={tagInput} onChange={(event) => updateGenerated({ tags: normalizeTags(event.target.value) })} placeholder="最多 4 个，用顿号或空格分隔" />
              </label>
              <div className="tag-row">
                {preview.generated.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>

              <div className="preview-actions">
                <button type="button" className="secondary-action ghost" onClick={readWorkInfo}>重新读取</button>
                <button type="button" className="secondary-action ghost" onClick={regenerateCover}>重新生成封面</button>
              </div>
            </section>
          )}

          <button type="submit" disabled={!preview}>确认提交</button>
          <p>{notice}</p>
          {saved && <Link className="success-link" href="/works">查看我的作品 →</Link>}
        </form>
      </section>
    </main>
  );
}
