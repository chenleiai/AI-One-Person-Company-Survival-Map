'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, treemap } from 'd3-hierarchy'
import {
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Gauge,
  GitBranch,
  Map,
  RefreshCcw,
  Share2,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { categories, questions, workerProfiles, type BusinessCategory, type QuestionOption, type Segment } from './data'

type AnswerMap = Record<string, QuestionOption>
type Pain = NonNullable<QuestionOption['pain']>
type WorkerKey = keyof typeof workerProfiles

type Report = {
  maturity: number
  replacementSpace: number
  releasedHours: number
  businessScore: number
  aiScore: number
  workflowScore: number
  growthScore: number
  retentionScore: number
  workerKey: WorkerKey
  closest: BusinessCategory[]
  modeName: string
  painLabel: string
  warning: string
}

type SharePoster = {
  url: string
  blob: Blob
  fileName: string
}

type TreeLeaf = {
  id: string
  name: string
  parentName: string
  cases: number
  aiMaturity: number
  adoptionSpace: number
  ordinaryFit: number
  revenueBand: string
  difficulty: number
  workers: string[]
  workflow: string[]
  monetization: string
  keyBlocker: string
  value: number
}

const dimensions = [
  { key: 'businessScore', label: '生存资产', icon: Target },
  { key: 'aiScore', label: 'AI员工配置', icon: Bot },
  { key: 'workflowScore', label: '流程武器化', icon: GitBranch },
  { key: 'growthScore', label: '机会入口', icon: BarChart3 },
  { key: 'retentionScore', label: '长期现金流', icon: RefreshCcw },
] as const

const modelPrinciples = [
  {
    title: '可替代压力',
    text: '越依赖重复执行、信息搬运、标准沟通，越容易被 AI 或会用 AI 的人压缩价值。',
  },
  {
    title: 'AI员工密度',
    text: '未来竞争不是一个人对一个人，而是一个人能不能带着 AI 研究员、销售、助理和复盘官一起工作。',
  },
  {
    title: '流程资产',
    text: '没有 SOP 的经验只能靠人硬扛，有 SOP 的经验才可能被 AI 放大、复制和持续改进。',
  },
  {
    title: '获客入口',
    text: '没有稳定入口的人，会越来越依赖平台、老板、甲方和运气。',
  },
  {
    title: '现金流韧性',
    text: '一次性交付会被卷，能复购、订阅、长期服务的人，才有机会扛住 AI 时代的价格重估。',
  },
]

const painLabels: Record<Pain, string> = {
  content: '内容生产',
  sales: '销售跟进',
  delivery: '交付服务',
  ops: '运营复盘',
  research: '信息研究',
  automation: '流程调度',
}

const coverageMetrics = [
  { label: '国民经济行业门类', value: '20', unit: '个' },
  { label: '行业大类', value: '97', unit: '个' },
  { label: '行业中类', value: '473', unit: '个' },
  { label: '行业小类', value: '1382', unit: '个' },
  { label: '职业分类大典', value: '1639', unit: '个职业' },
  { label: '工种岗位底座', value: '2967', unit: '个工种' },
]

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function compactCaseLabel(value: number, width: number) {
  if (width < 64 && value >= 1000) {
    const shortValue = Math.round(value / 100) / 10
    return `${Number.isInteger(shortValue) ? Math.round(shortValue) : shortValue}k样本`
  }

  return `${formatCount(value).replace(/,/g, '')}样本`
}

function fitTreemapMetaLine(cases: number, revenueBand: string, width: number) {
  const sample = `${formatCount(cases)} 个案例样本`
  if (width < 240) return sample

  const maxRevenueLength = width < 300 ? 6 : width < 360 ? 10 : 14
  const revenue = revenueBand.length > maxRevenueLength ? `${revenueBand.slice(0, maxRevenueLength)}…` : revenueBand
  return `${sample} · ${revenue}`
}

function estimateCaseCount(segment: Segment, category: BusinessCategory) {
  const raw =
    segment.cases * 130 +
    category.ordinaryFit * 2.6 +
    category.adoptionSpace * 2.1 +
    segment.aiMaturity * 1.8

  return Math.max(180, Math.round(raw / 10) * 10)
}

function categoryCaseTotal(category: BusinessCategory) {
  return category.segments.reduce((sum, segment) => sum + estimateCaseCount(segment, category), 0)
}

function maturityColor(value: number) {
  if (value >= 86) return '#0f9f6e'
  if (value >= 70) return '#55a630'
  if (value >= 55) return '#d99a00'
  if (value >= 40) return '#e66a2c'
  return '#c92a2a'
}

function fitTreemapLabel(name: string, width: number) {
  if (width < 68) return name.slice(0, 3)
  if (width < 92) return name.slice(0, 4)
  if (width < 128) return name.length > 6 ? `${name.slice(0, 6)}…` : name
  if (width < 170) return name.length > 8 ? `${name.slice(0, 8)}…` : name
  return name
}

function scoreLevel(value: number) {
  if (value >= 85) return '领先'
  if (value >= 70) return '可守'
  if (value >= 55) return '警戒'
  if (value >= 40) return '高压'
  return '危险'
}

function difficultyStars(difficulty: number) {
  return '★★★★★'.slice(0, difficulty)
}

function pickWorker(answers: AnswerMap): WorkerKey {
  const painVotes: Record<WorkerKey, number> = {
    content: 0,
    sales: 0,
    delivery: 0,
    ops: 0,
    research: 0,
    automation: 0,
  }

  Object.values(answers).forEach((answer) => {
    if (answer.pain && answer.pain in painVotes) {
      painVotes[answer.pain as WorkerKey] += answer.id === 'sales' || answer.id === 'automation' ? 2 : 1
    }
  })

  return Object.entries(painVotes).sort((a, b) => b[1] - a[1])[0][0] as WorkerKey
}

function buildReport(answers: AnswerMap): Report {
  const base = {
    business: 4,
    ai: 0,
    workflow: 0,
    growth: 0,
    retention: 0,
  }

  let repeatedHours = 8
  let selectedMode = 'content'
  const painVotes: Record<Pain, number> = {
    content: 0,
    sales: 0,
    delivery: 0,
    ops: 0,
    research: 0,
    automation: 0,
  }

  Object.values(answers).forEach((answer) => {
    base.business += answer.scores.business ?? 0
    base.ai += answer.scores.ai ?? 0
    base.workflow += answer.scores.workflow ?? 0
    base.growth += answer.scores.growth ?? 0
    base.retention += answer.scores.retention ?? 0
    if (answer.hours) repeatedHours = answer.hours
    if (answer.mode) selectedMode = answer.mode
    if (answer.pain) painVotes[answer.pain] += 1
  })

  const businessScore = clamp(base.business * 3.1)
  const aiScore = clamp(base.ai * 3.4)
  const workflowScore = clamp(base.workflow * 2.7)
  const growthScore = clamp(base.growth * 3)
  const retentionScore = clamp(base.retention * 3.6)
  const maturity = Math.round(
    businessScore * 0.22 +
      aiScore * 0.24 +
      workflowScore * 0.24 +
      growthScore * 0.16 +
      retentionScore * 0.14,
  )
  const replacementSpace = clamp(96 - maturity * 0.62 + repeatedHours * 0.55)
  const releasedHours = Math.max(3, Math.round(repeatedHours * (replacementSpace / 100) * 0.72))
  const workerKey = pickWorker(answers)
  const strongestPain = Object.entries(painVotes).sort((a, b) => b[1] - a[1])[0][0] as Pain
  const closest = categories
    .map((category) => {
      const modeBoost = category.id === selectedMode ? 24 : 0
      const maturityGap = Math.abs(category.aiMaturity - maturity)
      const fit = category.ordinaryFit * 0.35 + category.adoptionSpace * 0.25 + modeBoost - maturityGap * 0.2
      return { category, fit }
    })
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 2)
    .map((item) => item.category)

  const warning =
    replacementSpace >= 70
      ? '你当前的重复劳动暴露度偏高。如果不尽快配置 AI 员工，时间和价格都会被更高效的人压缩。'
      : replacementSpace >= 50
        ? '你已经有一定基础，但仍有一批高频工作没有变成 AI 可执行流程。'
        : '你的基础不错，下一步不是多装工具，而是把已有优势变成 AI 放大的系统。'

  return {
    maturity,
    replacementSpace: Math.round(replacementSpace),
    releasedHours,
    businessScore: Math.round(businessScore),
    aiScore: Math.round(aiScore),
    workflowScore: Math.round(workflowScore),
    growthScore: Math.round(growthScore),
    retentionScore: Math.round(retentionScore),
    workerKey,
    closest,
    modeName: closest[0]?.name ?? '内容型一人公司',
    painLabel: painLabels[strongestPain],
    warning,
  }
}

function buildTreeLeaves(): TreeLeaf[] {
  return categories.flatMap((category) =>
    category.segments.map((segment) => ({
      ...segment,
      cases: estimateCaseCount(segment, category),
      parentName: category.name,
      adoptionSpace: category.adoptionSpace,
      ordinaryFit: category.ordinaryFit,
      value: estimateCaseCount(segment, category) * (0.7 + category.ordinaryFit / 100) * (0.7 + category.adoptionSpace / 100),
    })),
  )
}

function TreemapView({
  selected,
  onSelect,
  onPreview,
  onClearPreview,
}: {
  selected: TreeLeaf | null
  onSelect: (leaf: TreeLeaf) => void
  onPreview: (leaf: TreeLeaf) => void
  onClearPreview: () => void
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 1440, height: 820 })

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const updateSize = () => {
      const rect = frame.getBoundingClientRect()
      const nextSize = {
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(360, Math.floor(rect.height)),
      }

      setSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height ? current : nextSize,
      )
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(frame)
    window.addEventListener('orientationchange', updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [])

  const leaves = useMemo(() => {
    const root = hierarchy<{ name: string; children: TreeLeaf[] } | TreeLeaf>({
      name: '全网AI一人公司',
      children: buildTreeLeaves(),
    })
      .sum((d) => ('value' in d ? d.value : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    return treemap<typeof root.data>()
      .size([size.width, size.height])
      .paddingOuter(2)
      .paddingInner(3)
      .round(true)(root)
      .leaves()
      .map((node) => ({
        node,
        data: node.data as TreeLeaf,
      }))
  }, [size.height, size.width])

  return (
    <div className="treemap-frame" ref={frameRef} onMouseLeave={onClearPreview}>
      <svg className="treemap" viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label="《AI一人公司》生存地图">
        {leaves.map(({ node, data }) => {
          const isSelected = selected?.id === data.id
          const width = node.x1 - node.x0
          const height = node.y1 - node.y0
          const tiny = width < 42 || height < 32
          const compact = width < 170 || height < 112
          const showCompactSample = compact && !tiny && width >= 50 && height >= 48
          const showCompactScore = compact && !tiny && width >= 76 && height >= 82
          const label = fitTreemapLabel(data.name, width)
          const labelX = compact ? 8 : 10
          const previewNode = () => onPreview(data)
          return (
            <g
              key={data.id}
              className={`tree-node ${isSelected ? 'is-selected' : ''}`}
              transform={`translate(${node.x0}, ${node.y0})`}
              onPointerEnter={previewNode}
              onPointerMove={previewNode}
              onMouseEnter={previewNode}
              onMouseMove={previewNode}
              onFocus={previewNode}
              onClick={() => onSelect(data)}
              tabIndex={0}
              role="button"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(data)
              }}
              aria-label={`${data.name}，${formatCount(data.cases)}个案例样本，AI化${formatPercent(data.aiMaturity)}`}
            >
              <title>{`${data.name}｜${formatCount(data.cases)}个案例样本｜AI化${formatPercent(data.aiMaturity)}`}</title>
              <rect
                width={width}
                height={height}
                rx={8}
                fill={maturityColor(data.aiMaturity)}
                style={{ filter: isSelected ? 'url(#nodeShadow)' : undefined }}
              />
              <rect width={width} height={height} rx={8} fill="rgba(255,255,255,.08)" />
              {!tiny && (
                <text x={labelX} y={compact ? 23 : 30} className="tree-title">
                  {label}
                </text>
              )}
              {showCompactSample && (
                <text
                  x={labelX}
                  y={showCompactScore ? 45 : Math.max(40, height - 12)}
                  className="tree-mini-meta"
                >
                  {compactCaseLabel(data.cases, width)}
                </text>
              )}
              {showCompactScore && (
                <text x={labelX} y={height - 16} className="tree-mini-score">
                  AI化 {formatPercent(data.aiMaturity)}
                </text>
              )}
              {!compact && !tiny && (
                <>
                  <text x={10} y={58} className="tree-meta">
                    {data.parentName}
                  </text>
                  <text x={10} y={height - 44} className="tree-score">
                    AI化 {formatPercent(data.aiMaturity)}
                  </text>
                  <text x={10} y={height - 20} className="tree-meta">
                    {fitTreemapMetaLine(data.cases, data.revenueBand, width)}
                  </text>
                </>
              )}
            </g>
          )
        })}
        <defs>
          <filter id="nodeShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#111827" floodOpacity="0.35" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}

function HoverDetailCard({ segment }: { segment: TreeLeaf | null }) {
  if (!segment) return null

  return (
    <aside className="hover-detail-card" aria-live="polite">
      <div className="hover-detail-head">
        <div>
          <span>{segment.parentName}</span>
          <h3>{segment.name}</h3>
        </div>
        <em>{scoreLevel(segment.aiMaturity)}</em>
      </div>
      <div className="hover-detail-stats">
        <div>
          <span>AI化</span>
          <strong>{formatPercent(segment.aiMaturity)}</strong>
        </div>
        <div>
          <span>案例样本</span>
          <strong>{formatCount(segment.cases)}</strong>
        </div>
        <div>
          <span>收入区间</span>
          <strong>{segment.revenueBand}</strong>
        </div>
        <div>
          <span>难度</span>
          <strong>{difficultyStars(segment.difficulty)}</strong>
        </div>
      </div>
      <div className="hover-detail-block">
        <span>必须补上的 AI 员工</span>
        <div className="hover-tags">
          {segment.workers.map((worker) => (
            <strong key={worker}>{worker}</strong>
          ))}
        </div>
      </div>
      <div className="hover-detail-block">
        <span>典型一天</span>
        <p>{segment.workflow.join(' → ')}</p>
      </div>
      <div className="hover-warning">
        <ShieldAlert size={17} />
        <p>{segment.keyBlocker}</p>
      </div>
      <div className="hover-detail-foot">点击方块查看完整模式详情</div>
    </aside>
  )
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'ok' | 'warn' }) {
  return (
    <div className={`stat-tile ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SegmentDetail({ segment }: { segment: TreeLeaf }) {
  return (
    <aside className="detail-panel">
      <div className="panel-heading">
        <span>{segment.parentName}</span>
        <h2>{segment.name}</h2>
      </div>
      <div className="detail-stats">
        <StatTile label="AI化成熟度" value={formatPercent(segment.aiMaturity)} tone={segment.aiMaturity >= 75 ? 'ok' : 'warn'} />
        <StatTile label="案例样本" value={`${formatCount(segment.cases)} 个`} />
        <StatTile label="难度等级" value={difficultyStars(segment.difficulty)} tone="danger" />
        <StatTile label="收入区间" value={segment.revenueBand} />
      </div>
      <div className="detail-block">
        <h3>必须补上的 AI 员工</h3>
        <div className="tag-list">
          {segment.workers.map((worker) => (
            <span key={worker}>{worker}</span>
          ))}
        </div>
      </div>
      <div className="detail-block">
        <h3>典型一天</h3>
        <ol className="timeline">
          {segment.workflow.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="detail-block">
        <h3>变现路径</h3>
        <p>{segment.monetization}</p>
      </div>
      <div className="warning-strip">
        <ShieldAlert size={18} />
        <span>{segment.keyBlocker}</span>
      </div>
    </aside>
  )
}

function DetailDrawer({ segment, onClose }: { segment: TreeLeaf | null; onClose: () => void }) {
  useEffect(() => {
    if (!segment) return

    const closeOnEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEsc)
    return () => window.removeEventListener('keydown', closeOnEsc)
  }, [segment, onClose])

  if (!segment) return null

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={`${segment.name}模式详情`} onClick={onClose}>
      <div className="detail-drawer" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" type="button" onClick={onClose} aria-label="关闭详情">
          <X size={18} />
          关闭
        </button>
        <SegmentDetail segment={segment} />
      </div>
    </div>
  )
}

function CoverageBoard() {
  const firstScreenMetrics = [
    coverageMetrics[0],
    coverageMetrics[1],
    coverageMetrics[4],
    coverageMetrics[5],
  ]

  return (
    <section className="coverage-board compact-coverage">
      <span className="eyebrow">权威数据来源</span>
      <div className="coverage-metrics">
        {firstScreenMetrics.map((item) => (
          <div className="coverage-metric" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <em>{item.unit}</em>
          </div>
        ))}
      </div>
    </section>
  )
}

function MapActions({ className = '' }: { className?: string }) {
  return (
    <div className={`map-actions ${className}`}>
      <a className="primary-action" href="#survey">
        <Gauge size={19} />
        生成我的报告
      </a>
      <a className="ghost-action" href="#cases">
        <FileText size={18} />
        查看案例
      </a>
    </div>
  )
}

function ProjectSourceCard() {
  return (
    <aside className="project-source-card">
      <span>项目发起</span>
      <a href="#source">@陈磊历险记</a>
      <p>观察普通人、小老板和一人公司，如何用 AI 重组工作与生意。</p>
      <div>
        <em>AI一人公司</em>
        <em>真实业务复盘</em>
      </div>
    </aside>
  )
}

function Survey({
  answers,
  setAnswers,
  onFinish,
}: {
  answers: AnswerMap
  setAnswers: (answers: AnswerMap) => void
  onFinish: () => void
}) {
  const answered = Object.keys(answers).length
  const canFinish = answered === questions.length

  return (
    <section className="survey-section" id="survey">
      <div className="section-header">
        <span className="eyebrow">3分钟生存体检</span>
        <h2>生成你的 AI 一人公司体检报告</h2>
        <p>不用懂技术，按真实情况选。系统会判断你的 AI 生存成熟度、重复劳动暴露度，以及最应该补上的第一个 AI 员工。</p>
      </div>
      <div className="progress-line">
        <span style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>
      <div className="question-grid">
        {questions.map((question, index) => (
          <div className="question-block" key={question.id}>
            <div className="question-title">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{question.title}</h3>
                <p>{question.subtitle}</p>
              </div>
            </div>
            <div className="option-list">
              {question.options.map((option) => (
                <button
                  type="button"
                  className={answers[question.id]?.id === option.id ? 'option is-active' : 'option'}
                  key={option.id}
                  onClick={() => setAnswers({ ...answers, [question.id]: option })}
                >
                  <CheckCircle2 size={18} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="survey-actions">
        <div>
          已完成 <strong>{answered}</strong> / {questions.length} 题
        </div>
        <button className="primary-action" type="button" disabled={!canFinish} onClick={onFinish}>
          <Sparkles size={19} />
          生成体检报告
        </button>
      </div>
    </section>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-row">
      <div className="score-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="score-track">
        <span style={{ width: `${value}%`, background: maturityColor(value) }} />
      </div>
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient,
  stroke?: string,
) {
  roundRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
) {
  const lines: string[] = []
  let line = ''
  let consumed = 0
  const noBreakBefore = '，。！？、；：,.!?'

  for (const [index, char] of Array.from(text).entries()) {
    const testLine = `${line}${char}`
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (noBreakBefore.includes(char)) {
        line = testLine
        consumed = index + 1
        continue
      }
      lines.push(line)
      consumed = index
      line = char
      if (lines.length >= maxLines) break
    } else {
      line = testLine
      consumed = index + 1
    }
  }

  if (lines.length < maxLines && line) {
    lines.push(line)
  }

  if (consumed < Array.from(text).length && lines.length) {
    let last = lines[Math.min(lines.length, maxLines) - 1]
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1)
    }
    lines[Math.min(lines.length, maxLines) - 1] = `${last}…`
  }

  lines.slice(0, maxLines).forEach((item, index) => {
    ctx.fillText(item, x, y + index * lineHeight)
  })
}

function drawShareMetric(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  fillRoundRect(ctx, x, y, width, 126, 16, '#12151e', 'rgba(232,197,90,0.16)')
  ctx.fillStyle = '#9a9daa'
  ctx.font = '700 24px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText(label, x + 24, y + 38)
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 44px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText(value, x + 24, y + 92)
}

function drawShareBar(ctx: CanvasRenderingContext2D, label: string, value: number, x: number, y: number, width: number) {
  const barY = y + 32
  const barHeight = 12

  ctx.fillStyle = '#eaeaea'
  ctx.font = '800 22px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText(label, x, y)
  ctx.fillStyle = '#e8c55a'
  ctx.textAlign = 'right'
  ctx.fillText(String(value), x + width, y)
  ctx.textAlign = 'left'
  fillRoundRect(ctx, x, barY, width, barHeight, 6, 'rgba(255,255,255,0.12)')
  fillRoundRect(ctx, x, barY, Math.max(20, (width * value) / 100), barHeight, 6, maturityColor(value))
  ctx.textBaseline = 'alphabetic'
}

async function makeShareImage(report: Report, worker: (typeof workerProfiles)[WorkerKey]) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1440
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建图片画布')

  const bg = ctx.createLinearGradient(0, 0, 0, 1440)
  bg.addColorStop(0, '#0c0e14')
  bg.addColorStop(0.52, '#101827')
  bg.addColorStop(1, '#0c0e14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1080, 1440)

  ctx.fillStyle = 'rgba(201,42,42,0.24)'
  ctx.beginPath()
  ctx.arc(930, 120, 260, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#e8c55a'
  ctx.font = '900 30px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('《AI一人公司》生存地图', 64, 78)
  ctx.fillStyle = '#9a9daa'
  ctx.font = '600 22px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('个人生存体检报告', 64, 114)

  ctx.fillStyle = '#ffffff'
  ctx.font = '900 62px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('我的 AI 一人公司', 64, 210)
  ctx.fillText('生存成熟度', 64, 286)

  ctx.fillStyle = '#e8c55a'
  ctx.font = '900 150px "SF Pro Display", "PingFang SC", sans-serif'
  ctx.fillText(String(report.maturity), 64, 458)
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 48px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('/100', 300, 438)
  fillRoundRect(ctx, 64, 486, 172, 52, 26, maturityColor(report.maturity))
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 26px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText(scoreLevel(report.maturity), 115, 522)

  drawShareMetric(ctx, 'AI重构压力', `${report.replacementSpace}%`, 64, 586, 296)
  drawShareMetric(ctx, '每周重复劳动', `${report.releasedHours}小时`, 392, 586, 296)
  drawShareMetric(ctx, '最该补的员工', worker.name, 720, 586, 296)

  fillRoundRect(ctx, 64, 750, 952, 170, 18, 'rgba(255,255,255,0.055)', 'rgba(232,197,90,0.14)')
  ctx.fillStyle = '#d4622a'
  ctx.font = '900 24px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('系统判断', 94, 794)
  ctx.fillStyle = '#eaeaea'
  ctx.font = '600 27px "PingFang SC", "Noto Sans SC", sans-serif'
  drawWrappedText(ctx, report.warning, 94, 840, 884, 38, 3)

  fillRoundRect(ctx, 64, 956, 452, 118, 18, '#12151e', 'rgba(255,255,255,0.1)')
  ctx.fillStyle = '#9a9daa'
  ctx.font = '700 23px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('最接近的全网模式', 92, 998)
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 34px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText(report.closest[0].name, 92, 1048)

  fillRoundRect(ctx, 548, 956, 468, 118, 18, '#12151e', 'rgba(255,255,255,0.1)')
  ctx.fillStyle = '#9a9daa'
  ctx.font = '700 23px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('下一步优先补上', 576, 998)
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 34px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText(worker.name, 576, 1048)

  const barsX = 82
  const barsY = 1088
  const barRowGap = 54
  dimensions.forEach((dimension, index) => {
    drawShareBar(ctx, dimension.label, report[dimension.key], barsX, barsY + index * barRowGap, 916)
  })

  ctx.fillStyle = '#eaeaea'
  ctx.font = '900 26px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('不是 AI 替代你，是会用 AI 的一个人替代一个团队。', 64, 1382)
  ctx.fillStyle = '#9a9daa'
  ctx.font = '700 22px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('@陈磊历险记 | 《AI一人公司》生存地图', 64, 1424)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('生成图片失败'))
    }, 'image/png')
  })
}

function shareFileName(report: Report) {
  return `AI一人公司生存体检报告-${report.maturity}分.png`
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

async function sharePosterBlob(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: '我的 AI 一人公司生存体检报告',
      text: '我刚生成了 AI 一人公司生存体检海报。',
      files: [file],
    })
    return
  }

  downloadBlob(blob, fileName)
}

function ReportView({ report, onReset }: { report: Report; onReset: () => void }) {
  const worker = workerProfiles[report.workerKey]
  const [poster, setPoster] = useState<SharePoster | null>(null)

  useEffect(() => {
    return () => {
      if (poster?.url) URL.revokeObjectURL(poster.url)
    }
  }, [poster?.url])

  const handleCreatePoster = async () => {
    try {
      const blob = await makeShareImage(report, worker)
      setPoster({
        blob,
        fileName: shareFileName(report),
        url: URL.createObjectURL(blob),
      })
    } catch (error) {
      console.error(error)
      window.alert('朋友圈海报生成失败，请稍后再试。')
    }
  }

  const handleSharePoster = async () => {
    if (!poster) return

    try {
      await sharePosterBlob(poster.blob, poster.fileName)
    } catch (error) {
      console.error(error)
      window.alert('分享失败，请先保存图片后再发朋友圈。')
    }
  }

  const handleSavePoster = () => {
    if (!poster) return
    downloadBlob(poster.blob, poster.fileName)
  }

  return (
    <section className="report-section" id="report">
      <div className="report-hero">
        <div>
          <span className="eyebrow">你的个人报告</span>
          <h2>你的 AI 一人公司成熟度：{report.maturity}/100</h2>
          <p>{report.warning}</p>
        </div>
        <div className="report-score" style={{ borderColor: maturityColor(report.maturity) }}>
          <strong>{report.maturity}</strong>
          <span>{scoreLevel(report.maturity)}</span>
        </div>
      </div>

      <div className="report-metrics">
        <div className="metric danger">
          <Flame size={22} />
          <span>AI重构压力</span>
          <strong>{report.replacementSpace}%</strong>
          <p>你当前约 {report.replacementSpace}% 的重复工作，正在被 AI 工具、自动化流程和会用 AI 的人重新定价。</p>
        </div>
        <div className="metric">
          <Clock3 size={22} />
          <span>每周被重复劳动吞掉</span>
          <strong>{report.releasedHours} 小时</strong>
          <p>这不是简单省时间，而是你被低价值工作锁住的真实成本。</p>
        </div>
        <div className="metric">
          <Bot size={22} />
          <span>最该补的 AI 员工</span>
          <strong>{worker.name}</strong>
          <p>{worker.reason}</p>
        </div>
        <div className="metric">
          <Map size={22} />
          <span>最接近的全网模式</span>
          <strong>{report.closest[0].name}</strong>
          <p>你当前更像这个模式，第二接近：{report.closest[1].name}。</p>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-panel">
          <div className="panel-heading">
            <span>五项体检分</span>
            <h3>你的生存短板在哪里</h3>
          </div>
          {dimensions.map((dimension) => {
            const Icon = dimension.icon
            const value = report[dimension.key]
            return (
              <div className="dimension-row" key={dimension.key}>
                <Icon size={18} />
                <ScoreBar label={dimension.label} value={value} />
              </div>
            )
          })}
        </div>

        <div className="report-panel">
          <div className="panel-heading">
            <span>第一优先级</span>
            <h3>先补上 {worker.name}</h3>
          </div>
          <div className="worker-block">
            <h4>它能帮你做什么</h4>
            <ul>
              {worker.capabilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="worker-block">
            <h4>接下来 7 天</h4>
            <ol>
              {worker.firstSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="case-compare">
        <div className="section-header compact">
          <span className="eyebrow">向全网 TOP 学习</span>
          <h2>你可以参考的两个模式</h2>
        </div>
        <div className="case-grid">
          {report.closest.map((category) => (
            <div className="case-card" key={category.id}>
              <div className="case-card-head">
                <h3>{category.name}</h3>
                <span>{formatPercent(category.aiMaturity)} AI化</span>
              </div>
              <p>{category.description}</p>
              <div className="mini-list">
                {category.segments.slice(0, 3).map((segment) => (
                  <span key={segment.id}>{segment.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="report-actions">
        <button className="secondary-action share-report-action" type="button" onClick={() => void handleCreatePoster()}>
          <Share2 size={18} />
          生成朋友圈海报
        </button>
        <button className="secondary-action" type="button" onClick={onReset}>
          <RefreshCcw size={18} />
          重新体检
        </button>
      </div>

      {poster && (
        <div
          className="poster-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="朋友圈海报预览"
          onClick={() => setPoster(null)}
        >
          <div className="poster-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="poster-head">
              <div>
                <span className="eyebrow">朋友圈海报预览</span>
                <h3>先确认图片，再保存分享</h3>
              </div>
              <button className="drawer-close" type="button" onClick={() => setPoster(null)} aria-label="关闭海报预览">
                <X size={18} />
                关闭
              </button>
            </div>
            <img className="poster-preview" src={poster.url} alt="AI一人公司生存体检朋友圈海报" />
            <div className="poster-actions">
              <button className="primary-action" type="button" onClick={() => void handleSharePoster()}>
                <Share2 size={18} />
                分享朋友圈
              </button>
              <button className="secondary-action" type="button" onClick={handleSavePoster}>
                <FileText size={18} />
                保存图片
              </button>
            </div>
            <p className="poster-note">微信环境可直接调起分享；普通浏览器会保存 PNG 图片，保存后再发朋友圈。</p>
          </div>
        </div>
      )}
    </section>
  )
}

function CaseLibrary() {
  return (
    <section className="case-library">
      <div className="section-header">
        <span className="eyebrow">案例库样例</span>
        <h2>公开案例样本，最终沉淀成全网 AI 一人公司样本库</h2>
        <p>第一版先用结构化样本展示模型。后续可以持续导入中国和海外案例，让每个人都能在里面找到自己的位置。</p>
      </div>
      <div className="library-grid">
        {categories.map((category) => (
          <article className="library-item" key={category.id}>
            <div className="library-top">
              <h3>{category.name}</h3>
              <span>{formatCount(categoryCaseTotal(category))} 个样本</span>
            </div>
            <p>{category.description}</p>
            <div className="library-meta">
              <span>AI化 {formatPercent(category.aiMaturity)}</span>
              <span>重构压力 {formatPercent(category.adoptionSpace)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ModelExplainer() {
  return (
    <section className="model-section" id="model">
      <div className="section-header">
        <span className="eyebrow">生存体检模型</span>
        <h2>未来不是 AI 替代你，而是“一个人带 AI 团队”的人替代你</h2>
        <p>
          这份报告采用五维评分：可替代压力、AI员工密度、流程资产、获客入口、现金流韧性。它要回答的不是你会不会用 AI，而是你在 AI 一人公司时代还能不能守住自己的位置。
        </p>
      </div>
      <div className="principle-grid">
        {modelPrinciples.map((item, index) => (
          <article className="principle-card" key={item.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [selected, setSelected] = useState<TreeLeaf | null>(() => buildTreeLeaves()[0])
  const [hoverDetail, setHoverDetail] = useState<TreeLeaf | null>(null)
  const [activeDetail, setActiveDetail] = useState<TreeLeaf | null>(null)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [report, setReport] = useState<Report | null>(null)

  const generateReport = () => {
    setReport(buildReport(answers))
    window.setTimeout(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const resetReport = () => {
    setAnswers({})
    setReport(null)
    window.setTimeout(() => document.getElementById('survey')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-lockup">
          <strong>AI 一人公司生存地图</strong>
        </div>
        <nav>
          <a href="#map">生存地图</a>
          <a href="#survey">生成报告</a>
          <a href="#model">生存模型</a>
          <a href="#cases">案例库</a>
        </nav>
      </header>

      <section className="map-layout map-first" id="map">
        <div className="map-left-rail">
          <aside className="map-sidebar">
            <div className="panel-heading">
              <h2>AI生存状态分布</h2>
            </div>
            <div className="legend-list">
              <div><span className="dot red" />高压区：大量工作仍靠人肉执行</div>
              <div><span className="dot orange" />警戒区：会用工具但没有系统</div>
              <div><span className="dot yellow" />转型区：关键流程开始 AI 化</div>
              <div><span className="dot green" />领先区：一个人已能带 AI 团队</div>
            </div>
          </aside>

          <CoverageBoard />
          <MapActions />
          <ProjectSourceCard />
        </div>

        <div className="map-canvas">
          <div className="canvas-head">
            <div className="canvas-title-stack">
              <span className="eyebrow">AI生存地图</span>
              <strong>方块大小 = 案例数量 × 普通人适配度 × AI重构压力</strong>
            </div>
            <div className="canvas-hint">移入预览，点击打开</div>
          </div>
          <MapActions className="canvas-mobile-actions" />
          <TreemapView
            selected={selected}
            onSelect={(leaf) => {
              setSelected(leaf)
              setActiveDetail(leaf)
            }}
            onPreview={(leaf) => {
              setSelected((current) => (current?.id === leaf.id ? current : leaf))
              setHoverDetail((current) => (current?.id === leaf.id ? current : leaf))
            }}
            onClearPreview={() => setHoverDetail(null)}
          />
        </div>
      </section>

      <HoverDetailCard segment={activeDetail ? null : hoverDetail} />
      <DetailDrawer segment={activeDetail} onClose={() => setActiveDetail(null)} />

      <Survey answers={answers} setAnswers={setAnswers} onFinish={generateReport} />
      {report && <ReportView report={report} onReset={resetReport} />}
      <ModelExplainer />
      <div id="cases">
        <CaseLibrary />
      </div>

      <footer id="source">
        <div>
          <strong>项目来源</strong>
          <p>
            本项目是面向大众的 AI 生存观察模型，不是学术统计或收入承诺。后续开源版本建议把案例源、估算规则、提交表单和更新日志全部公开。陈磊长期记录普通人、小老板、自由职业者和一人公司如何用 AI 重组工作、生意和个人能力，相关观察来自 <span className="source-signature">@陈磊历险记</span>。
          </p>
        </div>
        <a href="#map">
          回到地图
          <ChevronRight size={16} />
        </a>
      </footer>
    </main>
  )
}

export default App
