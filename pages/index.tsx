import { useCallback, useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import Head from 'next/head'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Spinner,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Link,
} from '@heroui/react'
import { Search, Compare, Deploy, Settings, External } from '../components/Icons'
import { cachedFetch, apiCache } from '../lib/api-cache'

interface SalaryData {
  [key: string]: {
    'annual-rates-of-pay': Array<{
      'effective-date': string | null;
      [stepKey: string]: string | number | null | undefined
    }>
  }
}

interface TopSalaries {
  [key: string]: number
}

interface MetricTile {
  label: string
  value: string
  helper: string
}

const formatSalary = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

export default function Home() {
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [topSalaries, setTopSalaries] = useState<TopSalaries | null>(null)
  const [popularList, setPopularList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataResponse, topResponse] = await Promise.all([
          cachedFetch('/api/data', undefined, 60), // Cache for 60 minutes
          cachedFetch('/api/top', undefined, 60),
        ])

        // The API returns { top: {...}, popular: [...] }
        const topData = topResponse?.top || {}
        const popularData = topResponse?.popular || []

        setSalaryData(dataResponse)
        setTopSalaries(topData)
        setPopularList(popularData)
      } catch (error) {
        console.error('Failed to load salary data', error)
      } finally {
        setLoading(false)
      }
    }

    // Clear cache on component mount to ensure fresh data
    apiCache.clear()

    fetchData()
  }, [])

  const allCodes = useMemo(
    () => (salaryData ? Object.keys(salaryData).sort((a, b) => a.localeCompare(b)) : []),
    [salaryData]
  )

  const stats = useMemo(() => {
    if (!salaryData || !topSalaries) return null

    const topValues = Object.values(topSalaries).filter(
      (value): value is number => typeof value === 'number'
    )
    if (!topValues.length) return null

    // Calculate min salaries (step-1 of each classification)
    // Only include annual salaries (>= 1000) to avoid mixing hourly/weekly/monthly rates
    const minSalaries: number[] = []
    let collectiveCount = 0
    let unrepresentedCount = 0
    let hourlyCount = 0
    let weeklyCount = 0
    let monthlyCount = 0

    Object.keys(salaryData).forEach(code => {
      // Skip SC and STD classifications - they have mixed rate types (monthly/annual/weekly/daily/hourly)
      if (code.startsWith('SC-') || code.startsWith('STD-')) return

      const rates = salaryData[code]['annual-rates-of-pay']
      if (!rates || rates.length === 0) return

      const mostRecent = rates[rates.length - 1]
      const firstStepKey = Object.keys(mostRecent).find(k => k === 'step-1')
      if (firstStepKey) {
        const val = mostRecent[firstStepKey]
        const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.]/g, ''))

        // Categorize by rate type
        if (!Number.isNaN(num)) {
          if (num < 100) {
            hourlyCount++
          } else if (num >= 100 && num < 1000) {
            weeklyCount++
          } else if (num >= 1000 && num < 10000) {
            monthlyCount++
          } else {
            // Only include annual salaries (>= 10000) in min salary stats
            minSalaries.push(num)
          }
        }
      }

      // Check if unrepresented based on _source URL
      const isUnrepresented = rates.some(rate =>
        rate._source &&
        typeof rate._source === 'string' &&
        rate._source.includes('unrepresented-senior-excluded')
      )

      if (isUnrepresented) {
        unrepresentedCount++
      } else {
        collectiveCount++
      }
    })

    const totalCodes = topValues.length
    const highest = Math.max(...topValues)
    const lowest = minSalaries.length > 0 ? Math.min(...minSalaries) : Math.min(...topValues)
    const average = Math.round(topValues.reduce((acc, value) => acc + value, 0) / topValues.length)

    const tiles: MetricTile[] = [
      {
        label: 'Total classifications',
        value: totalCodes.toLocaleString('en-CA'),
        helper: `${collectiveCount} collective agreement, ${unrepresentedCount} unrepresented/excluded. ${hourlyCount} hourly, ${weeklyCount} weekly, ${monthlyCount} monthly rates. Excludes SC/STD (mixed rates).`,
      },
      {
        label: 'Highest top salary',
        value: formatSalary(highest),
        helper: 'Maximum annual top-step salary recorded (excludes hourly/weekly/monthly rates, SC/STD).',
      },
      {
        label: 'Average top salary',
        value: formatSalary(average),
        helper: 'Mean of all top-step salaries in the dataset (excludes hourly/weekly/monthly rates, SC/STD).',
      },
      {
        label: 'Lowest starting salary',
        value: formatSalary(lowest),
        helper: 'Minimum annual step-1 salary across all classifications (excludes hourly/weekly/monthly rates, SC/STD).',
      },
    ]

    return tiles
  }, [topSalaries, salaryData])

  const getMostRecentSalaryInfo = useCallback((code: string) => {
    if (!salaryData || !salaryData[code]) return null

    const rates = salaryData[code]['annual-rates-of-pay']
    if (!rates || rates.length === 0) return null

    const mostRecent = rates[rates.length - 1]
    const steps = Object.keys(mostRecent).filter(key => key.startsWith('step-'))
    const stepCount = steps.length
    const minSalaryRaw = mostRecent[steps[0]]
    const maxSalaryRaw = mostRecent[steps[steps.length - 1]]

    const minSalary = typeof minSalaryRaw === 'number' ? minSalaryRaw : parseInt(minSalaryRaw as string)
    const maxSalary = typeof maxSalaryRaw === 'number' ? maxSalaryRaw : parseInt(maxSalaryRaw as string)

    // Detect wage type based on value ranges
    // Keep original values - don't convert
    const isHourly = minSalary < 1000

    // Determine rate type for display
    let rateType: 'annual' | 'hourly' | 'weekly' | 'monthly' = 'annual'
    if (minSalary < 100) {
      rateType = 'hourly'
    } else if (minSalary >= 100 && minSalary < 1000) {
      rateType = 'weekly'
    } else if (minSalary >= 1000 && minSalary < 10000) {
      rateType = 'monthly'
    }

    // Check if unrepresented
    const isUnrepresented = rates.some(rate =>
      rate._source &&
      typeof rate._source === 'string' &&
      rate._source.includes('unrepresented-senior-excluded')
    )

    // Get source URL
    const sourceUrl = typeof mostRecent._source === 'string' ? mostRecent._source : null

    return {
      effectiveDate: mostRecent['effective-date'],
      stepCount,
      minSalary,
      maxSalary,
      isHourly,
      rateType,
      isUnrepresented,
      sourceUrl,
    }
  }, [salaryData])

  const allClassifications = useMemo(() => {
    if (!salaryData) return []
    return Object.keys(salaryData).sort((a, b) => a.localeCompare(b))
  }, [salaryData])

  const quickResults = allClassifications.slice(0, 8)

  return (
    <>
      <Head>
        <title>Public Servant Salary Explorer</title>
        <meta
          name='description'
          content='Explore Canadian public servant salary data powered by HeroUI.'
        />
      </Head>
      <div className='space-y-10'>
        <Card className='border border-content3/40 bg-content1/80'>
          <CardBody className='grid gap-6 lg:grid-cols-[2fr,1fr]'>
            <div className='space-y-5'>
              <div className='space-y-2'>
                <Chip color='secondary' variant='flat' radius='sm' className='uppercase tracking-wide'>
                  Public Service Salary Data
                </Chip>
                <h1 className='text-3xl font-semibold leading-tight text-foreground md:text-4xl'>
                  Explore Canadian public servant salaries with precision.
                </h1>
                <p className='max-w-2xl text-sm text-default-500'>
                  Search, analyse, and compare Treasury Board salary schedules across hundreds of classifications.
                  Browse salary data, dive into equivalencies, or open the admin console to refresh the dataset in real time.
                </p>
              </div>
              <div className='flex flex-wrap gap-3'>
                <Button as={ NextLink } href='/search' color='success' size='md' variant='solid' startContent={ <Search className="w-4 h-4" /> }>
                  Advanced Search
                </Button>
                <Button as={ NextLink } href='/equivalency' color='secondary' size='md' variant='solid' startContent={ <Compare className="w-4 h-4" /> }>
                  Find Equivalencies
                </Button>
                <Button as={ NextLink } href='/deployment' color='warning' size='md' variant='solid' startContent={ <Deploy className="w-4 h-4" /> }>
                  Check Deployment
                </Button>
                <Button as={ NextLink } href='/admin' color='danger' size='md' variant='solid' startContent={ <Settings className="w-4 h-4" /> }>
                  Open Admin Console
                </Button>
              </div>
            </div>
            <Card className='border border-content3/30 bg-content2/60'>
              <CardHeader>
                <div className='space-y-1'>
                  <h2 className='text-lg font-semibold text-foreground'>Popular classifications</h2>
                  <p className='text-xs text-default-500'>Jump straight to commonly requested codes.</p>
                </div>
              </CardHeader>
              <CardBody className='gap-2'>
                <div className='flex flex-wrap gap-2'>
                  { (popularList.length ? popularList : ['IT', 'AS', 'PM', 'EC', 'FI', 'IS']).map((code) => (
                    <Chip
                      key={ code }
                      variant='flat'
                      color='primary'
                      className='cursor-pointer'
                      as={ NextLink }
                      href={ `/search?searchTerm=${encodeURIComponent(code)}` }
                    >
                      { code }
                    </Chip>
                  )) }
                </div>
                <Divider className='bg-content3/40' />
                <div className='space-y-2 text-xs text-default-500'>
                  <p>Need raw data? The API is open:</p>
                  <Button as={ NextLink } href='/api/data' size='sm' variant='bordered' className='w-fit'>
                    View JSON payload
                  </Button>
                </div>
              </CardBody>
            </Card>
          </CardBody>
        </Card>

        { stats && (
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            { stats.map((metric, index) => {
              const colors = ['primary', 'success', 'warning', 'secondary'] as const
              const color = colors[index % colors.length]
              return (
                <Card key={ metric.label } className='border border-content3/40 bg-content1/80'>
                  <CardBody className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <p className='text-xs uppercase tracking-wide text-default-500'>{ metric.label }</p>
                      <Chip color={ color } size='sm' variant='dot' radius='sm'></Chip>
                    </div>
                    <p className={ `text-2xl font-semibold text-${color}` }>{ metric.value }</p>
                    <p className='text-xs text-default-500'>{ metric.helper }</p>
                  </CardBody>
                </Card>
              )
            }) }
          </div>
        ) }



        <Card className='border border-content3/40 bg-content1/80'>
          <CardHeader className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-foreground'>Classification overview</h2>
              <p className='text-sm text-default-500'>
                { allClassifications.length.toLocaleString('en-CA') } classifications available.
              </p>
            </div>
          </CardHeader>
          <Divider className='bg-content3/40' />
          { loading ? (
            <div className='flex items-center justify-center p-16'>
              <Spinner color='primary' label='Loading salary data' />
            </div>
          ) : (
            <CardBody className='space-y-8'>
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                { quickResults.map((code) => {
                  const info = getMostRecentSalaryInfo(code)
                  const top = topSalaries?.[code]

                  return (
                    <Card key={ code } className='border border-content3/30 bg-content2/60'>
                      <CardBody className='space-y-2'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex flex-wrap gap-1'>
                            <Chip color='primary' variant='flat' radius='sm'>
                              { code }
                            </Chip>
                            { info?.rateType !== 'annual' && (
                              <Chip color='success' variant='dot' size='sm' radius='sm'>
                                { (info?.rateType || '').charAt(0).toUpperCase() + (info?.rateType || '').slice(1) }
                              </Chip>
                            ) }
                            { info?.isUnrepresented && (
                              <Chip color='warning' variant='dot' size='sm' radius='sm'>
                                Excluded
                              </Chip>
                            ) }
                          </div>
                          { top && info?.rateType === 'annual' ? (
                            <span className='text-sm font-medium text-foreground'>{ formatSalary(top) }</span>
                          ) : null }
                        </div>
                        { info ? (
                          <div className='space-y-1 text-xs text-default-500'>
                            <p>Range: { formatSalary(info.minSalary) } - { formatSalary(info.maxSalary) }{ info.rateType !== 'annual' && ` (${info.rateType})` }</p>
                            <p>Steps: { info.stepCount }</p>
                            { info.effectiveDate && <p>Effective: { info.effectiveDate }</p> }
                            { info.sourceUrl && (
                              <Link
                                href={ info.sourceUrl }
                                isExternal
                                showAnchorIcon
                                anchorIcon={ <External className='w-3 h-3' /> }
                                size='sm'
                                className='text-xs'
                              >
                                View source
                              </Link>
                            ) }
                          </div>
                        ) : (
                          <p className='text-xs text-default-500'>No recent salary information.</p>
                        ) }
                        <div className='flex gap-2 pt-2'>
                          <Button
                            as={ NextLink }
                            href={ `/api/${code.toLowerCase()}` }
                            size='sm'
                            variant='bordered'
                            color='secondary'
                            className='flex-1'
                          >
                            API
                          </Button>
                          <Button
                            as={ NextLink }
                            href={ `/search?searchTerm=${encodeURIComponent(code)}` }
                            size='sm'
                            color='success'
                            variant='flat'
                            className='flex-1'
                          >
                            Explore
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  )
                }) }
              </div>

              <Table aria-label='Classification salary table' className='border border-content3/40' removeWrapper>
                <TableHeader>
                  <TableColumn key='code'>Classification</TableColumn>
                  <TableColumn key='range'>Salary range</TableColumn>
                  <TableColumn key='top'>Top salary</TableColumn>
                  <TableColumn key='steps'>Steps</TableColumn>
                  <TableColumn key='effective'>Effective date</TableColumn>
                  <TableColumn key='source'>Source</TableColumn>
                  <TableColumn key='actions'>Actions</TableColumn>
                </TableHeader>
                <TableBody
                  emptyContent={
                    loading
                      ? 'Loading classifications...'
                      : 'No classifications available.'
                  }
                >
                  { allClassifications.map((code) => {
                    const info = getMostRecentSalaryInfo(code)
                    const top = topSalaries?.[code]
                    return (
                      <TableRow key={ code }>
                        <TableCell>
                          <div className='flex flex-wrap items-center gap-1'>
                            <span className='font-semibold text-foreground'>{ code }</span>
                            { info?.rateType !== 'annual' && (
                              <Chip color='success' variant='dot' size='sm' radius='sm'>
                                { (info?.rateType || '').charAt(0).toUpperCase() + (info?.rateType || '').slice(1) }
                              </Chip>
                            ) }
                            { info?.isUnrepresented && (
                              <Chip color='warning' variant='dot' size='sm' radius='sm'>
                                Excluded
                              </Chip>
                            ) }
                          </div>
                        </TableCell>
                        <TableCell>
                          { info ? (
                            <span className='text-sm text-default-500'>
                              { formatSalary(info.minSalary) } - { formatSalary(info.maxSalary) }{ info.rateType !== 'annual' && ` (${info.rateType})` }
                            </span>
                          ) : (
                            <span className='text-xs text-default-500'>Unavailable</span>
                          ) }
                        </TableCell>
                        <TableCell>{ top ? formatSalary(top) : '—' }</TableCell>
                        <TableCell>{ info?.stepCount ?? '—' }</TableCell>
                        <TableCell>{ info?.effectiveDate ?? '—' }</TableCell>
                        <TableCell>
                          { info?.sourceUrl ? (
                            <Link
                              href={ info.sourceUrl }
                              isExternal
                              showAnchorIcon
                              anchorIcon={ <External className='w-3 h-3' /> }
                              size='sm'
                            >
                              Link
                            </Link>
                          ) : '—' }
                        </TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button
                              as={ NextLink }
                              href={ `/api/${code.toLowerCase()}` }
                              size='sm'
                              variant='light'
                              color='secondary'
                            >
                              API
                            </Button>
                            <Button
                              as={ NextLink }
                              href={ `/search?searchTerm=${encodeURIComponent(code)}` }
                              size='sm'
                              variant='flat'
                              color='success'
                            >
                              Inspect
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  }) }
                </TableBody>
              </Table>
            </CardBody>
          ) }
        </Card>
      </div>
    </>
  )
}




