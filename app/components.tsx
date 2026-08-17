"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { gameCount, miniCount, ranking, Work } from "./data";

const navItems = [
  { href: "/works", label: "发现作品" },
  { href: "/works?sort=latest", label: "最新上船" },
  { href: "/ranking", label: "作品榜单" },
];

function isActive(pathname: string, href: string) {
  if (href === "/works?sort=latest") return false;
  if (pathname === "/" && href === "/works") return true;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="回到首页">
        <span className="wheel" aria-hidden="true">⚓</span>
        <span>生财航海作品舱</span>
      </Link>
      <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "关闭导航菜单" : "打开导航菜单"}>
        <span />
        <span />
      </button>
      <nav className={open ? "open" : ""} aria-label="主要导航">
        {navItems.map((item) => (
          <Link
            className={isActive(pathname, item.href) ? "active" : ""}
            href={item.href}
            key={item.href}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Link className="outline-btn link-btn" href="/submit">
        提交作品 <span>+</span>
      </Link>
    </header>
  );
}

export function HeroStats() {
  return (
    <div className="hero-stats" aria-label="作品数据">
      <div><span>▧ 已收录</span><strong>128</strong><small>个作品</small></div>
      <div><span>⌘ 小程序</span><strong>{miniCount}</strong><small>个作品</small></div>
      <div><span>⌁ 热词游戏站</span><strong>{gameCount}</strong><small>个作品</small></div>
    </div>
  );
}

export function WorkCover({ work, compact = false }: { work: Work; compact?: boolean }) {
  if (work.screenshot) {
    return (
      <div className={`cover screenshot-cover ${compact ? "cover-compact" : ""}`}>
        {work.latest && <span className="latest-badge">最新提交</span>}
        <img src={work.screenshot} alt={work.screenshotAlt || `${work.title}作品截图`} />
      </div>
    );
  }

  return (
    <div className={`cover screenshot-cover screenshot-missing ${compact ? "cover-compact" : ""}`}>
      {work.latest && <span className="latest-badge">最新提交</span>}
      <span>待接入真实作品截图</span>
    </div>
  );
}

export function WorkCard({ work }: { work: Work }) {
  return (
    <article className="work-card">
      <Link className="card-hit" href={`/works/${work.id}`} aria-label={`查看${work.title}`} />
      <WorkCover work={work} />
      <div className="card-body">
        <h3>{work.title}</h3>
        <div className="card-title-row">
          <span className="type-tag">{work.type}</span>
          {work.latest && <span className="hot-tag">最新提交</span>}
        </div>
        <p>{work.subtitle}</p>
        <div className="author-row">
          <span className="avatar">{work.maker.slice(0, 1)}</span>
          <strong>{work.maker}</strong>
        </div>
        <div className="meta-row">
          <span>{work.group}</span>
          <span>更新于 {work.updatedAt}</span>
        </div>
        <div className="card-bottom">
          {work.isWechatMiniProgram ? (
            <CopyMiniProgramLink value={work.url} />
          ) : (
            <Link href={work.url} target="_blank" rel="noreferrer">进入体验 ↗</Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function CopyMiniProgramLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="copy-link-button" type="button" onClick={copyLink}>
      {copied ? "已复制小程序链接" : "复制小程序链接"}
    </button>
  );
}

export function RankingPanel({ compact = false }: { compact?: boolean }) {
  const items = ranking.slice(0, compact ? 3 : 5);

  return (
    <aside className={`ranking ${compact ? "ranking-compact" : ""}`} id="ranking">
      <div className="ranking-head">
        <h2>本周作品榜</h2>
        <Link href="/ranking">完整榜单 →</Link>
      </div>
      <ol>
        {items.map((work, index) => (
          <li key={work.id}>
            <span className={`medal medal-${index + 1}`}>{index + 1}</span>
            <WorkCover work={work} compact />
            <Link href={`/works/${work.id}`}>
              <strong>{work.title}</strong>
              <small>{work.maker}</small>
            </Link>
            <em>{work.type}</em>
            <b>{work.score.toFixed(1)}</b>
          </li>
        ))}
      </ol>
      <p>综合作品完成度、体验、创意与船员反馈。</p>
      {!compact && (
        <Link className="ranking-cta" href="/submit">
          <span>你的作品也可以上榜</span>
          <small>持续更新优质作品，收获更多关注与认可</small>
          <b>提交作品 +</b>
        </Link>
      )}
    </aside>
  );
}

export function SortSelect({ activeType, activeSort, q }: { activeType: string; activeSort: string; q: string }) {
  const router = useRouter();

  function changeSort(sort: string) {
    const params = new URLSearchParams();
    if (activeType !== "all") params.set("type", activeType);
    if (sort !== "latest") params.set("sort", sort);
    if (q) params.set("q", q);
    const query = params.toString();
    router.push(`/works${query ? `?${query}` : ""}`);
  }

  return (
    <label className="sort-select">
      <select value={activeSort} onChange={(event) => changeSort(event.target.value)} aria-label="作品排序">
        <option value="latest">最近更新</option>
        <option value="score">评分最高</option>
      </select>
    </label>
  );
}
