'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { useLyzrAgentEvents } from '@/lib/lyzrAgentEvents'
import { AgentActivityPanel } from '@/components/AgentActivityPanel'
import {
  uploadAndTrainDocument,
  getDocuments,
  deleteDocuments,
} from '@/lib/ragKnowledgeBase'
import type { RAGDocument } from '@/lib/ragKnowledgeBase'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Shield,
  Home,
  AlertCircle,
  Settings,
  Send,
  Loader2,
  Globe,
  BarChart3,
  MapPin,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  FileText,
  Upload,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  TrendingUp,
  Eye,
  Filter,
  Search,
  Bot,
  Zap,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ==================== CONSTANTS ====================

const MANAGER_AGENT_ID = '6996d54a0970b3a6e013d02e'
const RAG_ID = '6996d500e12ce168202cfbaa'

// ==================== TYPES ====================

interface ExposureSummary {
  total_policies: number
  total_insured_value: string
  concentration_score: number
  yoy_growth: string
}

interface LOBBreakdown {
  line_of_business: string
  percentage: number
  insured_value: string
}

interface IntermediaryConcentration {
  name: string
  percentage: number
}

interface ThresholdBreach {
  metric: string
  current_value: string
  threshold: string
  status: string
}

interface CurrentThreat {
  threat_name: string
  severity: string
  description: string
}

interface RemedialAction {
  priority: number
  action: string
  rationale: string
  urgency: string
}

interface RiskConcentrationBriefing {
  severity_level: string
  geography: string
  briefing_summary: string
  exposure_summary: ExposureSummary
  lob_breakdown: LOBBreakdown[]
  intermediary_concentration: IntermediaryConcentration[]
  threshold_breaches: ThresholdBreach[]
  current_threats: CurrentThreat[]
  remedial_actions: RemedialAction[]
  historical_context: string
  risk_appetite_status: string
  analysis_timestamp: string
}

interface AlertItem {
  id: string
  severity: string
  geography: string
  metric: string
  timestamp: string
  currentValue: string
  threshold: string
  briefingSummary: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  briefing?: RiskConcentrationBriefing | null
  timestamp: string
}

interface ThresholdConfig {
  geographyType: string
  amberThreshold: number
  redThreshold: number
}

// ==================== SAMPLE DATA ====================

const SAMPLE_BRIEFING: RiskConcentrationBriefing = {
  severity_level: 'AMBER',
  geography: 'Southeast Florida',
  briefing_summary: 'The Southeast Florida region shows elevated concentration risk with a score of 72/100, driven primarily by high property exposure in coastal zones. Year-over-year growth of 14.2% exceeds the recommended 10% threshold. Immediate attention required on intermediary concentration, where Marsh & McLennan controls 38% of placed business.',
  exposure_summary: {
    total_policies: 12847,
    total_insured_value: '$18.4B',
    concentration_score: 72,
    yoy_growth: '+14.2%',
  },
  lob_breakdown: [
    { line_of_business: 'Commercial Property', percentage: 42, insured_value: '$7.7B' },
    { line_of_business: 'Residential Property', percentage: 28, insured_value: '$5.2B' },
    { line_of_business: 'Commercial Auto', percentage: 15, insured_value: '$2.8B' },
    { line_of_business: 'General Liability', percentage: 10, insured_value: '$1.8B' },
    { line_of_business: 'Workers Comp', percentage: 5, insured_value: '$0.9B' },
  ],
  intermediary_concentration: [
    { name: 'Marsh & McLennan', percentage: 38 },
    { name: 'Aon Risk Solutions', percentage: 22 },
    { name: 'Willis Towers Watson', percentage: 16 },
    { name: 'Lockton Companies', percentage: 12 },
    { name: 'Others', percentage: 12 },
  ],
  threshold_breaches: [
    { metric: 'Concentration Score', current_value: '72', threshold: '65', status: 'AMBER' },
    { metric: 'YoY Growth Rate', current_value: '14.2%', threshold: '10%', status: 'RED' },
    { metric: 'Single Intermediary Share', current_value: '38%', threshold: '35%', status: 'AMBER' },
    { metric: 'Coastal Exposure Ratio', current_value: '58%', threshold: '50%', status: 'RED' },
  ],
  current_threats: [
    { threat_name: 'Hurricane Season 2025', severity: 'HIGH', description: 'NOAA forecasts above-normal Atlantic hurricane season with 17-21 named storms. Direct landfall probability for SE Florida at 18%.' },
    { threat_name: 'Sea Level Rise', severity: 'MEDIUM', description: 'Continued tidal flooding increase in Miami-Dade County. 6-inch rise projected by 2030 impacting low-elevation coastal properties.' },
    { threat_name: 'Construction Cost Inflation', severity: 'MEDIUM', description: 'Building material costs up 8.3% YoY in Florida, creating potential underinsurance gap in property portfolios.' },
  ],
  remedial_actions: [
    { priority: 1, action: 'Implement new business moratorium for coastal property in Miami-Dade until concentration score falls below 65', rationale: 'Concentration score exceeds amber threshold and approaching red territory', urgency: 'Immediate' },
    { priority: 2, action: 'Diversify intermediary mix by redirecting 10% of Marsh portfolio to regional brokers', rationale: 'Single intermediary concentration exceeds 35% threshold', urgency: 'Short-term' },
    { priority: 3, action: 'Increase catastrophe reinsurance treaty limits by $500M for Florida wind exposure', rationale: 'Current limits insufficient for projected hurricane season severity', urgency: 'Short-term' },
    { priority: 4, action: 'Conduct ITV adequacy review for all SE Florida property policies >$5M TIV', rationale: 'Construction cost inflation creating underinsurance risk', urgency: 'Medium-term' },
  ],
  historical_context: 'Southeast Florida has historically been the highest-concentration geography in the portfolio. Hurricane Irma (2017) resulted in $2.1B gross losses from this region. Post-Irma remediation reduced concentration score from 85 to 61 by 2020, but subsequent growth has pushed it back to current levels.',
  risk_appetite_status: 'OUTSIDE APPETITE - The current concentration level of 72 exceeds the Board-approved risk appetite framework limit of 65 for coastal geographies. Remedial action plan required within 30 days per Risk Committee mandate.',
  analysis_timestamp: '2025-06-15T14:30:00Z',
}

const SAMPLE_ALERTS: AlertItem[] = [
  { id: 'a1', severity: 'RED', geography: 'Southeast Florida', metric: 'YoY Growth Rate', timestamp: '2025-06-15T14:30:00Z', currentValue: '14.2%', threshold: '10%', briefingSummary: 'Year-over-year growth significantly exceeds threshold' },
  { id: 'a2', severity: 'RED', geography: 'Southeast Florida', metric: 'Coastal Exposure Ratio', timestamp: '2025-06-15T14:30:00Z', currentValue: '58%', threshold: '50%', briefingSummary: 'Coastal exposure ratio has exceeded the red threshold' },
  { id: 'a3', severity: 'AMBER', geography: 'Southeast Florida', metric: 'Concentration Score', timestamp: '2025-06-15T14:30:00Z', currentValue: '72', threshold: '65', briefingSummary: 'Overall concentration score breaching amber threshold' },
  { id: 'a4', severity: 'AMBER', geography: 'Gulf Coast Texas', metric: 'Wind Exposure TIV', timestamp: '2025-06-14T09:15:00Z', currentValue: '$8.2B', threshold: '$7.5B', briefingSummary: 'Wind exposure total insured value approaching limits' },
  { id: 'a5', severity: 'GREEN', geography: 'Pacific Northwest', metric: 'Earthquake PML', timestamp: '2025-06-13T16:45:00Z', currentValue: '$2.1B', threshold: '$4.0B', briefingSummary: 'Earthquake probable maximum loss within acceptable limits' },
]

// ==================== HELPERS ====================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getSeverityColor(severity: string): string {
  const s = (severity ?? '').toUpperCase()
  if (s === 'RED' || s === 'HIGH' || s === 'CRITICAL') return 'bg-red-500'
  if (s === 'AMBER' || s === 'MEDIUM' || s === 'WARNING') return 'bg-amber-500'
  if (s === 'GREEN' || s === 'LOW' || s === 'OK') return 'bg-emerald-500'
  return 'bg-gray-400'
}

function getSeverityTextColor(severity: string): string {
  const s = (severity ?? '').toUpperCase()
  if (s === 'RED' || s === 'HIGH' || s === 'CRITICAL') return 'text-red-700'
  if (s === 'AMBER' || s === 'MEDIUM' || s === 'WARNING') return 'text-amber-700'
  if (s === 'GREEN' || s === 'LOW' || s === 'OK') return 'text-emerald-700'
  return 'text-gray-600'
}

function getSeverityBgLight(severity: string): string {
  const s = (severity ?? '').toUpperCase()
  if (s === 'RED' || s === 'HIGH' || s === 'CRITICAL') return 'bg-red-50 border-red-200'
  if (s === 'AMBER' || s === 'MEDIUM' || s === 'WARNING') return 'bg-amber-50 border-amber-200'
  if (s === 'GREEN' || s === 'LOW' || s === 'OK') return 'bg-emerald-50 border-emerald-200'
  return 'bg-gray-50 border-gray-200'
}

function getUrgencyBadgeVariant(urgency: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const u = (urgency ?? '').toLowerCase()
  if (u === 'immediate') return 'destructive'
  if (u === 'short-term') return 'default'
  return 'secondary'
}

function formatTimestamp(ts: string): string {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

// ==================== SUB-COMPONENTS ====================

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity ?? '').toUpperCase()
  const colorMap: Record<string, string> = {
    RED: 'bg-red-500 text-white',
    HIGH: 'bg-red-500 text-white',
    CRITICAL: 'bg-red-500 text-white',
    AMBER: 'bg-amber-500 text-white',
    MEDIUM: 'bg-amber-500 text-white',
    WARNING: 'bg-amber-500 text-white',
    GREEN: 'bg-emerald-500 text-white',
    LOW: 'bg-emerald-500 text-white',
    OK: 'bg-emerald-500 text-white',
  }
  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase', colorMap[s] ?? 'bg-gray-400 text-white')}>
      {severity ?? 'UNKNOWN'}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, subValue, alertColor }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subValue?: string
  alertColor?: string
}) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn('text-2xl font-serif font-bold', alertColor ?? 'text-foreground')}>{value}</p>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BriefingCard({ briefing }: { briefing: RiskConcentrationBriefing }) {
  const lobData = Array.isArray(briefing?.lob_breakdown) ? briefing.lob_breakdown : []
  const intermediaries = Array.isArray(briefing?.intermediary_concentration) ? briefing.intermediary_concentration : []
  const breaches = Array.isArray(briefing?.threshold_breaches) ? briefing.threshold_breaches : []
  const threats = Array.isArray(briefing?.current_threats) ? briefing.current_threats : []
  const actions = Array.isArray(briefing?.remedial_actions) ? briefing.remedial_actions : []

  const borderColor = briefing?.severity_level === 'RED' ? '#ef4444' : briefing?.severity_level === 'AMBER' ? '#f59e0b' : '#22c55e'

  return (
    <Card className="shadow-lg border-l-4" style={{ borderLeftColor: borderColor }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <SeverityBadge severity={briefing?.severity_level ?? ''} />
            <div>
              <CardTitle className="font-serif text-lg">{briefing?.geography ?? 'Unknown Region'}</CardTitle>
              <CardDescription className="text-xs">{formatTimestamp(briefing?.analysis_timestamp ?? '')}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs font-medium', getSeverityTextColor(briefing?.severity_level ?? ''))}>
            Score: {briefing?.exposure_summary?.concentration_score ?? 'N/A'}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Briefing Summary */}
        <div className="p-3 rounded-lg bg-secondary/50">
          {renderMarkdown(briefing?.briefing_summary ?? '')}
        </div>

        {/* Exposure Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground">Total Policies</p>
            <p className="text-lg font-bold font-serif">{briefing?.exposure_summary?.total_policies?.toLocaleString() ?? '---'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground">Total Insured Value</p>
            <p className="text-lg font-bold font-serif">{briefing?.exposure_summary?.total_insured_value ?? '---'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground">Concentration Score</p>
            <p className={cn('text-lg font-bold font-serif', getSeverityTextColor(briefing?.severity_level ?? ''))}>{briefing?.exposure_summary?.concentration_score ?? '---'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground">YoY Growth</p>
            <p className="text-lg font-bold font-serif">{briefing?.exposure_summary?.yoy_growth ?? '---'}</p>
          </div>
        </div>

        {/* Accordion sections */}
        <Accordion type="multiple" defaultValue={['lob', 'breaches']} className="space-y-2">
          {/* LOB Breakdown */}
          <AccordionItem value="lob" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-semibold py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Line of Business Breakdown
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                {lobData.map((lob, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{lob?.line_of_business ?? 'Unknown'}</span>
                      <span className="text-muted-foreground">{lob?.percentage ?? 0}% ({lob?.insured_value ?? '---'})</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(lob?.percentage ?? 0, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Intermediary Concentration */}
          <AccordionItem value="intermediary" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-semibold py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Intermediary Concentration
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                {intermediaries.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{item?.name ?? 'Unknown'}</span>
                      <span className="text-muted-foreground">{item?.percentage ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amber-600 transition-all duration-500" style={{ width: `${Math.min(item?.percentage ?? 0, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Threshold Breaches */}
          <AccordionItem value="breaches" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-semibold py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Threshold Breaches ({breaches.length})
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {breaches.map((breach, idx) => (
                  <div key={idx} className={cn('flex items-center justify-between p-2.5 rounded-lg border text-xs', getSeverityBgLight(breach?.status ?? ''))}>
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2.5 w-2.5 rounded-full', getSeverityColor(breach?.status ?? ''))} />
                      <span className="font-medium">{breach?.metric ?? 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{breach?.current_value ?? '---'}</span>
                      <span className="text-muted-foreground">/ {breach?.threshold ?? '---'}</span>
                      <SeverityBadge severity={breach?.status ?? ''} />
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Current Threats */}
          <AccordionItem value="threats" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-semibold py-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                Current Threats ({threats.length})
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {threats.map((threat, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={threat?.severity ?? ''} />
                      <span className="text-sm font-semibold">{threat?.threat_name ?? 'Unknown Threat'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{threat?.description ?? ''}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Remedial Actions */}
          <AccordionItem value="actions" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-semibold py-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Remedial Actions ({actions.length})
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {[...actions].sort((a, b) => (a?.priority ?? 99) - (b?.priority ?? 99)).map((action, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-background">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{action?.priority ?? idx + 1}</span>
                      <Badge variant={getUrgencyBadgeVariant(action?.urgency ?? '')} className="text-[10px]">{action?.urgency ?? 'N/A'}</Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{action?.action ?? ''}</p>
                    <p className="text-xs text-muted-foreground">{action?.rationale ?? ''}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Historical Context */}
          <AccordionItem value="history" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-semibold py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Historical Context
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {renderMarkdown(briefing?.historical_context ?? '')}
            </AccordionContent>
          </AccordionItem>

          {/* Risk Appetite Status */}
          <AccordionItem value="appetite" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-semibold py-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Risk Appetite Status
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className={cn('p-3 rounded-lg border', getSeverityBgLight(briefing?.severity_level ?? ''))}>
                {renderMarkdown(briefing?.risk_appetite_status ?? '')}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

function AlertSidebarItem({ alert, onClick }: { alert: AlertItem; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left p-3 rounded-lg border bg-card hover:shadow-md transition-all duration-200 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={cn('h-3 w-3 rounded-full flex-shrink-0', getSeverityColor(alert?.severity ?? ''))} />
        <span className="text-xs font-semibold truncate">{alert?.geography ?? 'Unknown'}</span>
        <SeverityBadge severity={alert?.severity ?? ''} />
      </div>
      <p className="text-xs text-muted-foreground truncate">{alert?.metric ?? ''}: {alert?.currentValue ?? ''} / {alert?.threshold ?? ''}</p>
      <p className="text-[10px] text-muted-foreground">{formatTimestamp(alert?.timestamp ?? '')}</p>
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ==================== MAIN PAGE ====================

export default function Page() {
  // Navigation
  const [activePage, setActivePage] = useState<'dashboard' | 'alerts' | 'settings'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Session
  const [sessionId, setSessionId] = useState<string>('')

  // Agent activity monitoring
  const agentActivity = useLyzrAgentEvents(sessionId || null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Data state
  const [latestBriefing, setLatestBriefing] = useState<RiskConcentrationBriefing | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)

  // Stats
  const [geoZones, setGeoZones] = useState(0)
  const [redAlertCount, setRedAlertCount] = useState(0)
  const [avgConcentration, setAvgConcentration] = useState(0)
  const [topRegion, setTopRegion] = useState('--')

  // Sample data toggle
  const [showSample, setShowSample] = useState(false)

  // Settings state
  const [thresholdConfigs, setThresholdConfigs] = useState<ThresholdConfig[]>([
    { geographyType: 'Coastal', amberThreshold: 60, redThreshold: 80 },
    { geographyType: 'Inland', amberThreshold: 70, redThreshold: 90 },
    { geographyType: 'Wildfire-Prone', amberThreshold: 55, redThreshold: 75 },
  ])
  const [watchlist, setWatchlist] = useState<string[]>(['Southeast Florida', 'Gulf Coast Texas', 'California Coast'])
  const [newWatchRegion, setNewWatchRegion] = useState('')

  // KB state
  const [kbDocuments, setKbDocuments] = useState<RAGDocument[]>([])
  const [kbLoading, setKbLoading] = useState(false)
  const [kbError, setKbError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Alert filtering
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('all')
  const [alertSearchQuery, setAlertSearchQuery] = useState('')

  // Initialize session ID
  useEffect(() => {
    setSessionId(crypto.randomUUID())
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Apply sample data effect
  useEffect(() => {
    if (showSample) {
      setLatestBriefing(SAMPLE_BRIEFING)
      setAlerts(SAMPLE_ALERTS)
      setGeoZones(12)
      setRedAlertCount(2)
      setAvgConcentration(72)
      setTopRegion('SE Florida')
      setChatMessages([
        {
          role: 'user',
          content: 'What is the property concentration risk in Southeast Florida?',
          timestamp: '2025-06-15T14:29:00Z',
        },
        {
          role: 'assistant',
          content: '',
          briefing: SAMPLE_BRIEFING,
          timestamp: '2025-06-15T14:30:00Z',
        },
      ])
    } else {
      setLatestBriefing(null)
      setAlerts([])
      setGeoZones(0)
      setRedAlertCount(0)
      setAvgConcentration(0)
      setTopRegion('--')
      setChatMessages([])
    }
  }, [showSample])

  // Fetch KB docs on settings page
  useEffect(() => {
    if (activePage === 'settings') {
      loadKbDocuments()
    }
  }, [activePage])

  const loadKbDocuments = useCallback(async () => {
    setKbLoading(true)
    setKbError(null)
    try {
      const result = await getDocuments(RAG_ID)
      if (result.success && Array.isArray(result.documents)) {
        setKbDocuments(result.documents)
      }
    } catch (e) {
      setKbError('Failed to load documents')
    }
    setKbLoading(false)
  }, [])

  // Extract alerts from briefing
  const extractAlerts = useCallback((briefing: RiskConcentrationBriefing) => {
    const newAlerts: AlertItem[] = []
    const breaches = Array.isArray(briefing?.threshold_breaches) ? briefing.threshold_breaches : []

    breaches.forEach((breach) => {
      const status = (breach?.status ?? '').toUpperCase()
      if (status === 'RED' || status === 'AMBER') {
        newAlerts.push({
          id: generateId(),
          severity: status,
          geography: briefing?.geography ?? 'Unknown',
          metric: breach?.metric ?? 'Unknown',
          timestamp: briefing?.analysis_timestamp ?? new Date().toISOString(),
          currentValue: breach?.current_value ?? '',
          threshold: breach?.threshold ?? '',
          briefingSummary: briefing?.briefing_summary ?? '',
        })
      }
    })

    return newAlerts
  }, [])

  // Update stats from briefing
  const updateStatsFromBriefing = useCallback((briefing: RiskConcentrationBriefing, allAlerts: AlertItem[]) => {
    const geographies = new Set(allAlerts.map((a) => a.geography))
    geographies.add(briefing?.geography ?? '')
    setGeoZones(geographies.size)
    setRedAlertCount(allAlerts.filter((a) => (a?.severity ?? '').toUpperCase() === 'RED').length)
    setAvgConcentration(briefing?.exposure_summary?.concentration_score ?? 0)
    setTopRegion(briefing?.geography ?? '--')
  }, [])

  // Handle message send
  const handleSendMessage = useCallback(async () => {
    const msg = inputMessage.trim()
    if (!msg || loading) return

    setInputMessage('')
    setError(null)
    setLoading(true)

    const userMsg: ChatMessage = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, userMsg])

    // Set processing for agent activity monitoring
    agentActivity.setProcessing(true)

    try {
      const result = await callAIAgent(msg, MANAGER_AGENT_ID, { session_id: sessionId })

      if (result.success && result.response?.status === 'success') {
        const rawResult = result.response.result
        let briefing: RiskConcentrationBriefing | null = null

        // Try direct access first
        if (rawResult && typeof rawResult === 'object' && rawResult.severity_level) {
          briefing = rawResult as RiskConcentrationBriefing
        } else {
          // Parse via LLM JSON parser
          const parsed = parseLLMJson(rawResult)
          if (parsed && parsed.severity_level) {
            briefing = parsed as RiskConcentrationBriefing
          }
        }

        // Also try result.response.message if result is empty
        if (!briefing && result.response.message) {
          const parsed = parseLLMJson(result.response.message)
          if (parsed && parsed.severity_level) {
            briefing = parsed as RiskConcentrationBriefing
          }
        }

        if (briefing) {
          setLatestBriefing(briefing)
          const newAlerts = extractAlerts(briefing)
          setAlerts((prev) => {
            const combined = [...newAlerts, ...prev]
            updateStatsFromBriefing(briefing!, combined)
            return combined
          })

          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: '',
            briefing,
            timestamp: briefing?.analysis_timestamp ?? new Date().toISOString(),
          }
          setChatMessages((prev) => [...prev, assistantMsg])
        } else {
          // Fallback: text response
          const text = result.response?.message ?? JSON.stringify(rawResult)
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: typeof text === 'string' ? text : JSON.stringify(text),
            timestamp: new Date().toISOString(),
          }
          setChatMessages((prev) => [...prev, assistantMsg])
        }
      } else {
        setError(result.response?.message ?? result.error ?? 'Request failed. Please try again.')
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: result.response?.message ?? 'An error occurred while processing your request.',
          timestamp: new Date().toISOString(),
        }
        setChatMessages((prev) => [...prev, errorMsg])
      }
    } catch (e) {
      setError('Network error. Please check your connection and try again.')
    }

    agentActivity.setProcessing(false)
    setLoading(false)
  }, [inputMessage, loading, sessionId, agentActivity, extractAlerts, updateStatsFromBriefing])

  // Handle KB upload
  const handleKbUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setKbLoading(true)
    setKbError(null)
    try {
      const file = files[0]
      const result = await uploadAndTrainDocument(RAG_ID, file)
      if (result.success) {
        await loadKbDocuments()
      } else {
        setKbError(result.error ?? 'Upload failed')
      }
    } catch (err) {
      setKbError('Failed to upload document')
    }
    setKbLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [loadKbDocuments])

  // Handle KB delete
  const handleKbDelete = useCallback(async (fileName: string) => {
    setKbLoading(true)
    setKbError(null)
    try {
      const result = await deleteDocuments(RAG_ID, [fileName])
      if (result.success) {
        setKbDocuments((prev) => prev.filter((d) => d.fileName !== fileName))
      } else {
        setKbError(result.error ?? 'Delete failed')
      }
    } catch {
      setKbError('Failed to delete document')
    }
    setKbLoading(false)
  }, [])

  // Filtered alerts
  const filteredAlerts = alerts.filter((alert) => {
    const sevMatch = alertSeverityFilter === 'all' || (alert?.severity ?? '').toUpperCase() === alertSeverityFilter.toUpperCase()
    const searchMatch = !alertSearchQuery || (alert?.geography ?? '').toLowerCase().includes(alertSearchQuery.toLowerCase()) || (alert?.metric ?? '').toLowerCase().includes(alertSearchQuery.toLowerCase())
    return sevMatch && searchMatch
  })

  // ==================== NAVIGATION ITEMS ====================

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'alerts' as const, label: 'Alert History', icon: AlertCircle },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ]

  // ==================== RENDER ====================

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ===== LEFT SIDEBAR ===== */}
      <aside className={cn('flex-shrink-0 bg-sidebar-background border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out z-30', sidebarOpen ? 'w-60' : 'w-0 md:w-16 overflow-hidden')}>
        {/* Branding */}
        <div className={cn('p-4 border-b border-sidebar-border', !sidebarOpen && 'md:px-2')}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary flex-shrink-0">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-serif font-bold text-sidebar-foreground tracking-tight leading-tight">CatRisk</h1>
                <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Sentinel</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200', isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-sidebar-foreground hover:bg-sidebar-accent')}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Agent Status Footer */}
        {sidebarOpen && (
          <div className="p-3 border-t border-sidebar-border space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Agent Status</p>
            <div className="space-y-1.5">
              {[
                { name: 'Risk Coordinator', id: MANAGER_AGENT_ID, role: 'Manager' },
                { name: 'Exposure Data', id: '6996d52e9c31ef52445780e5', role: 'Sub-Agent' },
                { name: 'Underwriting', id: '6996d52fd9786499c59b72e6', role: 'Sub-Agent' },
                { name: 'Cat Intel', id: '6996d52ff5839f3b10ef9ccd', role: 'Sub-Agent' },
              ].map((agent) => (
                <div key={agent.id} className="flex items-center gap-2 text-[11px]">
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0', agentActivity.activeAgentId === agent.id ? 'bg-amber-500 animate-pulse' : loading && agent.role === 'Manager' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500')} />
                  <span className="text-sidebar-foreground truncate">{agent.name}</span>
                  <span className="ml-auto text-muted-foreground text-[9px]">{agent.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-between px-4 border-b bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 w-8">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <h2 className="text-base font-serif font-bold">{activePage === 'dashboard' ? 'Risk Analysis Dashboard' : activePage === 'alerts' ? 'Alert History' : 'Settings'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
            </div>
            {agentActivity.isProcessing && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Processing</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {/* ===== DASHBOARD PAGE ===== */}
          {activePage === 'dashboard' && (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Left: Main Content (70%) */}
              <div className="flex-1 lg:w-[70%] overflow-y-auto p-4 lg:p-6 space-y-5">
                {/* Stat Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard icon={Globe} label="Geo Zones Monitored" value={geoZones || '--'} subValue="Active regions" />
                  <StatCard icon={AlertCircle} label="Active Red Alerts" value={redAlertCount || 0} alertColor={redAlertCount > 0 ? 'text-red-600' : undefined} subValue="Requires attention" />
                  <StatCard icon={BarChart3} label="Avg Concentration" value={avgConcentration ? `${avgConcentration}/100` : '--'} subValue="Portfolio score" />
                  <StatCard icon={MapPin} label="Top Exposed Region" value={topRegion} subValue="Highest concentration" />
                </div>

                {/* Risk Query Chat Panel */}
                <Card className="shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-serif text-base flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      Risk Intelligence Query
                    </CardTitle>
                    <CardDescription className="text-xs">Ask the coordinator about risk concentration in any geography. The manager agent coordinates exposure data, underwriting guidelines, and catastrophe intelligence agents.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Chat History */}
                    <ScrollArea className="h-[320px] mb-3 pr-2">
                      <div className="space-y-3">
                        {chatMessages.length === 0 && !loading && (
                          <div className="text-center py-12 space-y-3">
                            <Shield className="h-10 w-10 mx-auto text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No queries yet. Start analyzing risk concentration.</p>
                            <p className="text-xs text-muted-foreground/70">Try asking: &quot;What is the property concentration in Southeast Florida?&quot;</p>
                          </div>
                        )}
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                            <div className={cn('max-w-[90%] rounded-lg', msg.role === 'user' ? 'bg-primary text-primary-foreground p-3' : 'w-full')}>
                              {msg.role === 'user' ? (
                                <p className="text-sm">{msg.content}</p>
                              ) : msg.briefing ? (
                                <BriefingCard briefing={msg.briefing} />
                              ) : (
                                <div className="p-3 rounded-lg bg-secondary text-sm">{renderMarkdown(msg.content)}</div>
                              )}
                              {msg.role === 'user' && (
                                <p className="text-[10px] mt-1.5 opacity-60">{formatTimestamp(msg.timestamp)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {loading && (
                          <div className="flex justify-start">
                            <div className="w-full">
                              <LoadingSkeleton />
                              <div className="flex items-center gap-2 mt-2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">
                                  {agentActivity.activeAgentName ? `${agentActivity.activeAgentName} is analyzing...` : 'Analyzing risk concentration...'}
                                </span>
                              </div>
                              {agentActivity.lastThinkingMessage && (
                                <div className="mt-2 p-2 rounded bg-muted/50 border border-border">
                                  <p className="text-[11px] text-muted-foreground italic line-clamp-3">{agentActivity.lastThinkingMessage}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Error */}
                    {error && (
                      <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-700 flex-1">{error}</p>
                        <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => setError(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Input */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask about risk concentration in any geography..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        rows={2}
                        className="resize-none text-sm flex-1"
                        disabled={loading}
                      />
                      <Button onClick={handleSendMessage} disabled={loading || !inputMessage.trim()} className="self-end h-10 px-4">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Agent Activity Panel */}
                <AgentActivityPanel
                  isConnected={agentActivity.isConnected}
                  events={agentActivity.events}
                  thinkingEvents={agentActivity.thinkingEvents}
                  lastThinkingMessage={agentActivity.lastThinkingMessage}
                  activeAgentId={agentActivity.activeAgentId}
                  activeAgentName={agentActivity.activeAgentName}
                  isProcessing={agentActivity.isProcessing}
                  className="shadow-md"
                />
              </div>

              {/* Right: Alerts Feed (30%) */}
              <div className="lg:w-[30%] border-l bg-card flex flex-col overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                  <h3 className="text-sm font-serif font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Active Alerts
                  </h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActivePage('alerts')}>
                    View All <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-2">
                    {alerts.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <Shield className="h-8 w-8 mx-auto text-emerald-400/50" />
                        <p className="text-xs text-muted-foreground">No active alerts</p>
                        <p className="text-[10px] text-muted-foreground/70">Your portfolio is within appetite.</p>
                      </div>
                    ) : (
                      alerts.slice(0, 10).map((alert) => (
                        <AlertSidebarItem
                          key={alert.id}
                          alert={alert}
                          onClick={() => setSelectedAlert(alert)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Alert Detail Sheet */}
                {activePage === 'dashboard' && (
                  <Sheet open={!!selectedAlert} onOpenChange={(open) => { if (!open) setSelectedAlert(null) }}>
                    <SheetContent className="w-[360px] sm:w-[420px]">
                      <SheetHeader>
                        <SheetTitle className="font-serif flex items-center gap-2">
                          <SeverityBadge severity={selectedAlert?.severity ?? ''} />
                          Alert Detail
                        </SheetTitle>
                        <SheetDescription>
                          {selectedAlert?.geography ?? ''} - {selectedAlert?.metric ?? ''}
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-secondary">
                            <p className="text-[10px] text-muted-foreground uppercase">Current Value</p>
                            <p className="text-sm font-bold">{selectedAlert?.currentValue ?? '--'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary">
                            <p className="text-[10px] text-muted-foreground uppercase">Threshold</p>
                            <p className="text-sm font-bold">{selectedAlert?.threshold ?? '--'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Timestamp</p>
                          <p className="text-sm">{formatTimestamp(selectedAlert?.timestamp ?? '')}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Briefing Summary</p>
                          <div className="text-sm text-muted-foreground">{renderMarkdown(selectedAlert?.briefingSummary ?? '')}</div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
          )}

          {/* ===== ALERT HISTORY PAGE ===== */}
          {activePage === 'alerts' && (
            <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-4">
              {/* Filter Bar */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Filters</span>
                    </div>
                    <Select value={alertSeverityFilter} onValueChange={setAlertSeverityFilter}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="RED">Red</SelectItem>
                        <SelectItem value="AMBER">Amber</SelectItem>
                        <SelectItem value="GREEN">Green</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search geography or metric..."
                        value={alertSearchQuery}
                        onChange={(e) => setAlertSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">{filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Table */}
              <Card className="shadow-md">
                <CardContent className="p-0">
                  {filteredAlerts.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <Shield className="h-10 w-10 mx-auto text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No alerts match your filters</p>
                      <p className="text-xs text-muted-foreground/70">Run a risk analysis query to generate alerts.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs w-[140px]">Date</TableHead>
                            <TableHead className="text-xs">Geography</TableHead>
                            <TableHead className="text-xs w-[90px]">Severity</TableHead>
                            <TableHead className="text-xs">Metric</TableHead>
                            <TableHead className="text-xs w-[100px]">Current</TableHead>
                            <TableHead className="text-xs w-[100px]">Threshold</TableHead>
                            <TableHead className="text-xs w-[60px]">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...filteredAlerts]
                            .sort((a, b) => new Date(b?.timestamp ?? 0).getTime() - new Date(a?.timestamp ?? 0).getTime())
                            .map((alert) => (
                              <TableRow key={alert.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setSelectedAlert(alert)}>
                                <TableCell className="text-xs">{formatTimestamp(alert?.timestamp ?? '')}</TableCell>
                                <TableCell className="text-xs font-medium">{alert?.geography ?? '--'}</TableCell>
                                <TableCell><SeverityBadge severity={alert?.severity ?? ''} /></TableCell>
                                <TableCell className="text-xs">{alert?.metric ?? '--'}</TableCell>
                                <TableCell className="text-xs font-bold">{alert?.currentValue ?? '--'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{alert?.threshold ?? '--'}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert) }}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alert Detail Sheet (for alerts page) */}
              <Sheet open={!!selectedAlert && activePage === 'alerts'} onOpenChange={(open) => { if (!open) setSelectedAlert(null) }}>
                <SheetContent className="w-[360px] sm:w-[420px]">
                  <SheetHeader>
                    <SheetTitle className="font-serif flex items-center gap-2">
                      <SeverityBadge severity={selectedAlert?.severity ?? ''} />
                      Alert Detail
                    </SheetTitle>
                    <SheetDescription>
                      {selectedAlert?.geography ?? ''} - {selectedAlert?.metric ?? ''}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-secondary">
                        <p className="text-[10px] text-muted-foreground uppercase">Current Value</p>
                        <p className="text-sm font-bold">{selectedAlert?.currentValue ?? '--'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary">
                        <p className="text-[10px] text-muted-foreground uppercase">Threshold</p>
                        <p className="text-sm font-bold">{selectedAlert?.threshold ?? '--'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Timestamp</p>
                      <p className="text-sm">{formatTimestamp(selectedAlert?.timestamp ?? '')}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Briefing Summary</p>
                      <div className="text-sm text-muted-foreground">{renderMarkdown(selectedAlert?.briefingSummary ?? '')}</div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* ===== SETTINGS PAGE ===== */}
          {activePage === 'settings' && (
            <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-5">
              <Tabs defaultValue="thresholds" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="thresholds" className="text-xs">Thresholds</TabsTrigger>
                  <TabsTrigger value="watchlist" className="text-xs">Watchlist</TabsTrigger>
                  <TabsTrigger value="knowledge" className="text-xs">Knowledge Base</TabsTrigger>
                  <TabsTrigger value="status" className="text-xs">Connections</TabsTrigger>
                </TabsList>

                {/* Threshold Configuration */}
                <TabsContent value="thresholds">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif text-base">Concentration Threshold Configuration</CardTitle>
                      <CardDescription className="text-xs">Set amber and red threshold limits by geography type. These thresholds determine alert severity in risk analyses.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {thresholdConfigs.map((config, idx) => (
                        <div key={idx} className="p-4 rounded-lg border bg-secondary/30 space-y-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">{config.geographyType}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-amber-700">Amber Threshold</Label>
                              <Input
                                type="number"
                                value={config.amberThreshold}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  setThresholdConfigs((prev) => prev.map((c, i) => i === idx ? { ...c, amberThreshold: val } : c))
                                }}
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-red-700">Red Threshold</Label>
                              <Input
                                type="number"
                                value={config.redThreshold}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  setThresholdConfigs((prev) => prev.map((c, i) => i === idx ? { ...c, redThreshold: val } : c))
                                }}
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${config.amberThreshold}%` }} />
                            </div>
                            <span>{config.amberThreshold}</span>
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${Math.max(config.redThreshold - config.amberThreshold, 0)}%` }} />
                            </div>
                            <span>{config.redThreshold}</span>
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-red-500" style={{ width: `${Math.max(100 - config.redThreshold, 0)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button className="w-full mt-2">
                        <Shield className="h-4 w-4 mr-2" />
                        Save Threshold Configuration
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Geography Watchlist */}
                <TabsContent value="watchlist">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif text-base">Geography Watchlist</CardTitle>
                      <CardDescription className="text-xs">Add or remove specific regions for priority monitoring. Watchlisted regions will be highlighted in alert feeds.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a region (e.g., Pacific Northwest)"
                          value={newWatchRegion}
                          onChange={(e) => setNewWatchRegion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newWatchRegion.trim()) {
                              setWatchlist((prev) => [...prev, newWatchRegion.trim()])
                              setNewWatchRegion('')
                            }
                          }}
                          className="flex-1 h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newWatchRegion.trim()) {
                              setWatchlist((prev) => [...prev, newWatchRegion.trim()])
                              setNewWatchRegion('')
                            }
                          }}
                          disabled={!newWatchRegion.trim()}
                          className="h-9"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {watchlist.map((region, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-secondary/30">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-primary" />
                              <span className="text-sm">{region}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-red-500"
                              onClick={() => setWatchlist((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        {watchlist.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-6">No regions in watchlist. Add a region above.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Knowledge Base */}
                <TabsContent value="knowledge">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif text-base">Underwriting Guidelines Knowledge Base</CardTitle>
                      <CardDescription className="text-xs">Upload PDF, DOCX, or TXT files containing underwriting guidelines. The Underwriting Guidelines Agent uses this knowledge base to provide accurate threshold and policy information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Upload Area */}
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-secondary/30 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-medium">Click to upload document</p>
                        <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOCX, TXT</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={handleKbUpload}
                          className="hidden"
                        />
                      </div>

                      {kbLoading && (
                        <div className="flex items-center gap-2 justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Processing...</span>
                        </div>
                      )}

                      {kbError && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-700">{kbError}</p>
                        </div>
                      )}

                      {/* Documents List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Uploaded Documents</p>
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={loadKbDocuments} disabled={kbLoading}>
                            <RefreshCw className={cn('h-3 w-3 mr-1', kbLoading && 'animate-spin')} />
                            Refresh
                          </Button>
                        </div>
                        {kbDocuments.length === 0 && !kbLoading ? (
                          <p className="text-center text-xs text-muted-foreground py-6">No documents uploaded yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {kbDocuments.map((doc, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-secondary/30">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{doc?.fileName ?? 'Unknown'}</p>
                                    <p className="text-[10px] text-muted-foreground">{doc?.fileType ?? ''}{doc?.status ? ` - ${doc.status}` : ''}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500 flex-shrink-0"
                                  onClick={() => doc?.fileName && handleKbDelete(doc.fileName)}
                                  disabled={kbLoading}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Connection Status */}
                <TabsContent value="status">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="font-serif text-base">Data Connection Status</CardTitle>
                      <CardDescription className="text-xs">Monitor the status of agent connections and data feeds.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { name: 'Risk Intelligence Coordinator (Manager)', id: MANAGER_AGENT_ID, status: 'Connected' },
                        { name: 'Exposure Data Agent', id: '6996d52e9c31ef52445780e5', status: 'Connected' },
                        { name: 'Underwriting Guidelines Agent', id: '6996d52fd9786499c59b72e6', status: 'Connected' },
                        { name: 'Catastrophe Intel Agent', id: '6996d52ff5839f3b10ef9ccd', status: 'Connected' },
                        { name: 'Knowledge Base (RAG)', id: RAG_ID, status: 'Connected' },
                        { name: 'Agent Events WebSocket', id: 'ws-events', status: agentActivity.isConnected ? 'Connected' : 'Idle' },
                      ].map((conn) => (
                        <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', conn.status === 'Connected' ? 'bg-emerald-500' : 'bg-gray-400')} />
                            <div>
                              <p className="text-sm font-medium">{conn.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{conn.id}</p>
                            </div>
                          </div>
                          <Badge variant={conn.status === 'Connected' ? 'default' : 'secondary'} className="text-[10px]">{conn.status}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
