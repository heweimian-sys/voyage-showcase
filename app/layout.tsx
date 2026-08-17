import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "生财航海作品舱",
  description: "集中展示航海群船员完成的小程序与热词游戏站，支持微信身份更新作品链接。",
  other: { "codex-preview":"development" },
  icons: { icon:"/favicon.svg", shortcut:"/favicon.svg" },
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
