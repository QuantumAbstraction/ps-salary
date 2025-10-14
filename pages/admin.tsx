import { useMemo, useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Code,
  Divider,
  Progress,
  ScrollShadow,
  Skeleton,
  Spacer,
  Switch,
  type ChipProps,
} from '@heroui/react'
import { Upload } from '../components/Icons'

type SalaryEntry = {
  'annual-rates-of-pay': Array<{
    'effective-date': string;
    [key: string]: string | number
  }>
}

type SalaryMap = Record<string, SalaryEntry>

interface GroupSummary {
  group: string
  total: number
  codes: string[]
}

interface ScraperResponse {
  success?: boolean
  message?: string
  newClassifications?: number
  processedClassifications?: number
  data?: SalaryMap
  persistedTotal?: number
  updatedAt?: string
  groupSummary?: GroupSummary[]
  newCodes?: string[]
  error?: string
  details?: string
}

const buildGroupSummary = (payload?: SalaryMap | null): GroupSummary[] => {
  if (!payload) return []
  const summary = new Map<string, Set<string>>()
  for (const rawCode of Object.keys(payload)) {
    if (!rawCode) continue
    const normalizedCode = rawCode.toUpperCase()
    const groupMatch = normalizedCode.match(/^[A-Z]+/)
    const group = groupMatch ? groupMatch[0] : normalizedCode
    if (!summary.has(group)) {
      summary.set(group, new Set())
    }
    summary.get(group)!.add(normalizedCode)
  }
  return Array.from(summary.entries())
    .map(([group, codes]) => ({
      group,
      total: codes.size,
      codes: Array.from(codes).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.group.localeCompare(b.group))
}

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-CA')
    : '0'

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function Admin() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScraperResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groupStats, setGroupStats] = useState<GroupSummary[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [persistedTotal, setPersistedTotal] = useState<number | null>(null)

  // AI settings
  const [useAI, setUseAI] = useState(false)
  const [forceAI, setForceAI] = useState(false)

  // Progress tracking
  const [progress, setProgress] = useState<number>(0)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState<string>('')
  const [urlsProcessed, setUrlsProcessed] = useState<number>(0)
  const [totalUrls, setTotalUrls] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [aiStats, setAiStats] = useState<{ calls: number; cost: number; successful: number } | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const statusMeta = useMemo(() => {
    if (isLoading) return { label: 'Running', color: 'warning' as ChipProps['color'] }
    if (error) return { label: 'Error', color: 'danger' as ChipProps['color'] }
    if (result) return { label: 'Completed', color: 'success' as ChipProps['color'] }
    return { label: 'Idle', color: 'default' as ChipProps['color'] }
  }, [error, isLoading, result])

  const runScraper = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setGroupStats([])
    setProgress(0)
    setCurrentUrl('')
    setCurrentStatus('')
    setUrlsProcessed(0)
    setTotalUrls(0)
    setLogs([])
    setAiStats(null)

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString()
      setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    }

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      addLog('🚀 Starting scraper...')
      if (useAI) {
        addLog(forceAI ? '🤖 AI mode: FORCE (all pages)' : '🤖 AI mode: HYBRID (problematic pages only)')
      } else {
        addLog('📄 AI mode: DISABLED (DOM parsing only)')
      }

      // Use EventSource for Server-Sent Events with AI parameters
      const params = new URLSearchParams()
      if (useAI) params.append('useAI', 'true')
      if (forceAI) params.append('forceAI', 'true')

      const url = `/api/scraper-stream${params.toString() ? '?' + params.toString() : ''}`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data)
        console.info('[admin] Scraper started, total URLs:', data.total)
        setTotalUrls(data.total)
        setCurrentStatus('Starting scraper...')
        addLog(`📊 Processing ${data.total} URLs`)
      })

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data)
        console.info('[admin] Progress:', data)

        setUrlsProcessed(data.current)
        setProgress(data.percentage)
        setCurrentUrl(data.url)

        if (data.status === 'fetching') {
          setCurrentStatus(`Fetching ${data.url}...`)
          addLog(`📥 Fetching: ${data.url}`)
        } else if (data.status === 'parsed') {
          const codesText = data.codesFound > 0
            ? ` (${data.codesFound} codes${data.codes ? ': ' + data.codes.slice(0, 5).join(', ') + (data.codesFound > 5 ? '...' : '') : ''})`
            : ''

          // Add AI info if available
          const aiInfo = data.aiUsed
            ? ` | 🤖 AI: ${data.aiMethod}, cost: $${data.aiCost?.toFixed(4) || '0.00'}, confidence: ${(data.aiConfidence * 100)?.toFixed(0) || '0'}%`
            : data.aiUsed === false
              ? ' | 📄 DOM parsing'
              : ''

          setCurrentStatus(`Parsed ${data.url}${codesText}${aiInfo}`)
          addLog(`✅ Parsed: ${data.url}${codesText}${aiInfo}`)
        } else if (data.status === 'error') {
          addLog(`❌ Error: ${data.url} - ${data.error || 'Unknown error'}`)
        }
      })

      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data)
        console.info('[admin] Scraper complete:', data)

        setProgress(100)
        setCurrentStatus('Scraper completed successfully!')
        addLog('🎉 Scraper completed successfully!')

        // Log AI statistics if available
        if (data.aiStats) {
          setAiStats(data.aiStats)
          addLog(`📊 AI Statistics: ${data.aiStats.calls} calls, ${data.aiStats.successful} successful (${((data.aiStats.successful / data.aiStats.calls) * 100).toFixed(1)}%), total cost: $${data.aiStats.cost.toFixed(4)}`)
        }

        addLog(`📈 Processed ${data.processedClassifications} classifications, ${data.newClassifications} new`)

        // Build result object
        const finalResult: ScraperResponse = {
          success: true,
          processedClassifications: data.processedClassifications,
          newClassifications: data.newClassifications,
          persistedTotal: data.persistedTotal,
          updatedAt: data.updatedAt
        }

        setResult(finalResult)
        setLastUpdated(data.updatedAt)
        setPersistedTotal(data.persistedTotal)

        // Fetch the updated data to build group summary
        fetch('/api/data')
          .then(r => r.json())
          .then(salaryData => {
            const summary = buildGroupSummary(salaryData)
            setGroupStats(summary)
            console.table(summary.map(({ group, total }) => ({ group, total })))
            addLog(`📋 Generated group summary for ${summary.length} groups`)
          })
          .catch(err => {
            console.error('[admin] Error fetching data for summary:', err)
            addLog(`⚠️ Error generating group summary: ${err.message}`)
          })

        eventSource.close()
        eventSourceRef.current = null
        setIsLoading(false)
      })

      eventSource.addEventListener('error', (e: Event) => {
        const messageEvent = e as MessageEvent
        console.error('[admin] SSE error event:', messageEvent)

        let errorMsg = 'Connection error during scraping'

        // Try to parse error data if available
        if (messageEvent.data) {
          try {
            const data = JSON.parse(messageEvent.data)
            if (data.fatal) {
              errorMsg = `Fatal error: ${data.error}`
            } else if (data.url) {
              errorMsg = `Error scraping ${data.url}: ${data.error}`
              // Don't stop on individual URL errors, continue
              return
            }
          } catch {
            // Not JSON, connection error
          }
        }

        setError(errorMsg)
        eventSource.close()
        eventSourceRef.current = null
        setIsLoading(false)
      })

      // Handle connection errors
      eventSource.onerror = (e) => {
        console.error('[admin] EventSource connection error:', e)

        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection was closed - check if we completed successfully
          if (progress < 100 && !result) {
            setError('Connection closed unexpectedly. The scraper may still be running.')
          }
          setIsLoading(false)
        }
      }

    } catch (err) {
      console.error('[admin] Scraper error:', err)

      if (err instanceof Error) {
        setError(`Scraper error: ${err.message}`)
      } else {
        setError('Unknown error occurred during scraping')
      }

      setIsLoading(false)

      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }

  const newCodes = result?.newCodes ?? []
  const processedThisRun =
    result?.processedClassifications ??
    (result?.data ? Object.keys(result.data).length : null)

  const metricTiles = useMemo(
    () => [
      {
        label: 'Processed this run',
        value: formatNumber(processedThisRun),
        helper: 'Records gathered in the latest scrape.',
      },
      {
        label: 'New classifications',
        value: formatNumber(result?.newClassifications ?? null),
        helper: 'Fresh codes appended to data.json.',
      },
      {
        label: 'Persisted total',
        value: formatNumber(persistedTotal),
        helper: 'Total unique classifications stored.',
      },
      {
        label: 'data.json updated',
        value: formatTimestamp(lastUpdated),
        helper: 'Timestamp of the latest successful write.',
      },
    ],
    [lastUpdated, persistedTotal, processedThisRun, result?.newClassifications]
  )

  return (
    <>
      <Head>
        <title>Admin — HeroUI Console</title>
      </Head>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <Card className="border border-content3/40 bg-content1/80 backdrop-blur-md">
          <CardHeader className="items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-default-400">
                Salary Data Ops
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-foreground">
                Public Servant Salary Scraper
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-default-400">
                Trigger the canonical scraper, persist the dataset, and review grouped classifications in one dark-first dashboard.
              </p>
            </div>
            <Chip color={ statusMeta.color } variant="flat" radius="sm" className="uppercase tracking-wide">
              { statusMeta.label }
            </Chip>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  color="primary"
                  size="lg"
                  variant="solid"
                  onPress={ runScraper }
                  isLoading={ isLoading }
                  startContent={ !isLoading ? <Upload className="w-4 h-4" /> : undefined }
                >
                  Run Scraper
                </Button>
                { lastUpdated && (
                  <Chip variant="bordered" color="secondary" radius="sm">
                    Last run: { formatTimestamp(lastUpdated) }
                  </Chip>
                ) }
                { persistedTotal !== null && (
                  <Chip variant="bordered" radius="sm">
                    Stored records: { formatNumber(persistedTotal) }
                  </Chip>
                ) }
              </div>

              <Card className="border border-content3/40 bg-content2/40">
                <CardHeader className="pb-2">
                  <p className="text-sm font-semibold text-foreground">🤖 AI Settings</p>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Switch
                    isSelected={ useAI }
                    onValueChange={ setUseAI }
                    isDisabled={ isLoading }
                    size="sm"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-sm">Enable AI-Assisted Parsing</p>
                      <p className="text-xs text-default-400">
                        Use GPT-4 for complex table formats (hybrid mode: ~$0.15 per scrape)
                      </p>
                    </div>
                  </Switch>

                  { useAI && (
                    <Switch
                      isSelected={ forceAI }
                      onValueChange={ setForceAI }
                      isDisabled={ isLoading }
                      size="sm"
                      color="warning"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-sm">Force AI for All Pages</p>
                        <p className="text-xs text-default-400">
                          Override smart detection and use AI for every URL (~$0.84 per scrape)
                        </p>
                      </div>
                    </Switch>
                  ) }

                  { aiStats && (
                    <div className="mt-2 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                      <p className="text-xs font-semibold text-primary-200 mb-2">Last Run AI Stats</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-default-400">API Calls:</span>
                          <span className="ml-2 text-foreground font-medium">{ aiStats.calls }</span>
                        </div>
                        <div>
                          <span className="text-default-400">Successful:</span>
                          <span className="ml-2 text-foreground font-medium">
                            { aiStats.successful } ({ ((aiStats.successful / aiStats.calls) * 100).toFixed(1) }%)
                          </span>
                        </div>
                        <div>
                          <span className="text-default-400">Total Cost:</span>
                          <span className="ml-2 text-foreground font-medium">${ aiStats.cost.toFixed(4) }</span>
                        </div>
                        <div>
                          <span className="text-default-400">Avg Cost:</span>
                          <span className="ml-2 text-foreground font-medium">
                            ${ (aiStats.cost / aiStats.calls).toFixed(4) }
                          </span>
                        </div>
                      </div>
                    </div>
                  ) }
                </CardBody>
              </Card>
            </div>

            { isLoading && (
              <Card className="border border-primary-500/40 bg-primary-500/5">
                <CardBody className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      Scraping in progress...
                    </p>
                    <Chip color="primary" variant="flat" radius="sm" size="sm">
                      { urlsProcessed } / { totalUrls }
                    </Chip>
                  </div>

                  <Progress
                    value={ progress }
                    color="primary"
                    size="md"
                    className="w-full"
                    aria-label="Scraping progress"
                    showValueLabel={ true }
                  />

                  { currentUrl && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-default-400">
                        Current URL
                      </p>
                      <Code className="w-full text-xs">{ currentUrl }</Code>
                    </div>
                  ) }

                  { currentStatus && (
                    <p className="text-sm text-default-500">
                      { currentStatus }
                    </p>
                  ) }
                </CardBody>
              </Card>
            ) }

            { logs.length > 0 && (
              <Card className="border border-content3/40 bg-content2/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-sm font-semibold text-foreground">📝 Scraper Logs</p>
                    <Chip size="sm" variant="flat" color="secondary" radius="sm">
                      { logs.length } entries
                    </Chip>
                  </div>
                </CardHeader>
                <CardBody>
                  <ScrollShadow className="h-64 overflow-y-auto">
                    <div className="space-y-1 font-mono text-xs pr-2">
                      { logs.map((log, index) => (
                        <div key={ index } className="text-default-600 hover:text-foreground transition-colors">
                          { log }
                        </div>
                      )) }
                      <div ref={ logsEndRef } />
                    </div>
                  </ScrollShadow>
                </CardBody>
              </Card>
            ) }

            { isLoading && !progress && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3 rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
            ) }

            { error && (
              <Card className="border-danger-500/40 bg-danger-500/10">
                <CardBody className="space-y-2">
                  <Chip color="danger" variant="flat" radius="sm" className="self-start uppercase">
                    Error
                  </Chip>
                  <p className="text-sm text-danger-200">{ error }</p>
                </CardBody>
              </Card>
            ) }

            { result && (
              <div className="space-y-6">
                { result.message && (
                  <Card className="border-primary-500/30 bg-primary-500/5">
                    <CardBody>
                      <p className="text-sm text-primary-200">{ result.message }</p>
                    </CardBody>
                  </Card>
                ) }

                <Divider className="bg-content3" />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  { metricTiles.map((item) => (
                    <Card key={ item.label } className="border border-content3/40 bg-content2/60">
                      <CardBody className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-default-400">{ item.label }</p>
                        <p className="text-2xl font-semibold text-foreground">{ item.value }</p>
                        <p className="text-xs text-default-500">{ item.helper }</p>
                      </CardBody>
                    </Card>
                  )) }
                </div>

                { newCodes.length > 0 && (
                  <Card className="border border-content3/40 bg-content2/60">
                    <CardHeader className="flex-col items-start gap-2">
                      <p className="text-sm font-semibold text-foreground">New classifications</p>
                      <p className="text-xs text-default-500">
                        Recently appended codes in this refresh cycle.
                      </p>
                    </CardHeader>
                    <CardBody className="gap-2">
                      <ScrollShadow className="max-h-48 overflow-y-auto pr-2">
                        <div className="flex flex-wrap gap-2">
                          { newCodes.map((code) => (
                            <Chip key={ code } variant="flat" color="success" radius="sm">
                              { code }
                            </Chip>
                          )) }
                        </div>
                      </ScrollShadow>
                    </CardBody>
                  </Card>
                ) }

                { groupStats.length > 0 && (
                  <Card className="border border-content3/40 bg-content2/60">
                    <CardHeader className="flex-col items-start gap-2">
                      <p className="text-sm font-semibold text-foreground">Classification group totals</p>
                      <p className="text-xs text-default-500">
                        Grouped by the alpha prefix (for example: AS-01 → AS).
                      </p>
                    </CardHeader>
                    <CardBody>
                      <ScrollShadow className="max-h-80 overflow-y-auto pr-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                          { groupStats.map((group) => (
                            <Card
                              key={ group.group }
                              className="border border-content3/40 bg-content1/70"
                            >
                              <CardBody className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Chip size="sm" color="secondary" variant="flat" radius="sm">
                                    { group.group }
                                  </Chip>
                                  <span className="text-xs text-default-500">{ group.total } codes</span>
                                </div>
                                <p className="text-xs leading-relaxed text-default-400">
                                  { group.codes.slice(0, 10).join(', ') }
                                  { group.codes.length > 10 && (
                                    <span className="text-default-500"> +{ group.codes.length - 10 } more</span>
                                  ) }
                                </p>
                              </CardBody>
                            </Card>
                          )) }
                        </div>
                      </ScrollShadow>
                    </CardBody>
                  </Card>
                ) }

                { result.data && Object.keys(result.data).length > 0 && (
                  <Accordion variant="bordered" defaultExpandedKeys={ ['raw'] }
                    className="bg-content2/70 border border-content3/40"
                  >
                    <AccordionItem
                      key="raw"
                      aria-label="Raw payload"
                      title={
                        <div className="flex items-center gap-2">
                          <Chip size="sm" variant="flat" color="secondary" radius="sm">
                            JSON
                          </Chip>
                          <span>View raw response</span>
                        </div>
                      }
                    >
                      <Code className="block max-h-72 overflow-auto text-xs">
                        { JSON.stringify(result.data, null, 2) }
                      </Code>
                    </AccordionItem>
                  </Accordion>
                ) }
              </div>
            ) }
          </CardBody>
        </Card>

        <Spacer y={ 4 } />
      </div>
    </>
  )
}
