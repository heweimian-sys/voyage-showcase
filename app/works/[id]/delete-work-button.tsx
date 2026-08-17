"use client";

import { FormEvent, useState } from "react";

export function DeleteWorkButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removeWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/submissions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, manageToken: localStorage.getItem(`voyage:manage:${id}`) || "" }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "删除作品失败。");
      localStorage.removeItem(`voyage:manage:${id}`);
      window.location.assign("/works?deleted=1");
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
      <p>删除后作品会从作品舱移除，无法撤销。请确认这是你提交的作品。</p>
      {error && <p className="delete-error" role="alert">{error}</p>}
      <div>
        <button className="danger-button" type="submit" disabled={busy}>{busy ? "正在删除..." : "确认删除"}</button>
        <button className="cancel-button" type="button" onClick={() => { setOpen(false); setError(""); }} disabled={busy}>取消</button>
      </div>
    </form>
  );
}
