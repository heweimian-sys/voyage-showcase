"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteWorkButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wechat, setWechat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removeWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wechat.trim()) {
      setError("请输入提交时使用的微信昵称或身份信息。");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/submissions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, wechat: wechat.trim() }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "删除作品失败。");
      router.replace("/works");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除作品失败。");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="danger-button" type="button" onClick={() => setOpen(true)}>
        删除作品
      </button>
    );
  }

  return (
    <form className="delete-confirm" onSubmit={removeWork}>
      <strong>确认删除“{title}”？</strong>
      <p>删除后作品会从作品舱移除，无法撤销。请输入提交时的身份信息进行确认。</p>
      <label>
        微信昵称 / 身份信息
        <input
          value={wechat}
          onChange={(event) => setWechat(event.target.value)}
          autoComplete="off"
          disabled={busy}
        />
      </label>
      {error && <p className="delete-error" role="alert">{error}</p>}
      <div>
        <button className="danger-button" type="submit" disabled={busy}>{busy ? "正在删除..." : "确认删除"}</button>
        <button className="cancel-button" type="button" onClick={() => { setOpen(false); setError(""); }} disabled={busy}>取消</button>
      </div>
    </form>
  );
}
