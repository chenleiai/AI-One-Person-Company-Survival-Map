import type { Metadata } from 'next'
import '../src/index.css'
import '../src/App.css'

export const metadata: Metadata = {
  title: 'AI 一人公司生存地图',
  description: '全网 AI 一人公司生存地图、3 分钟生存体检和个性化报告。',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'AI 一人公司生存地图',
    description: '测一测你在 AI 时代的位置、可替代压力和最该补上的 AI 员工。',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
