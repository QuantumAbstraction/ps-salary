import { useCallback, useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import Head from 'next/head'
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Slider,
  Spinner,
  Tab,
  Tabs,
} from '@heroui/react'
import { Deploy, Search, External } from '../components/Icons'

interface SalaryData {
  [key: string]: {
    'annual-rates-of-pay': Array<{
      'effective-date': string | null;
      [key: string]: string | number | null | undefined
    }>
  }
}

interface TopSalaries {
  [key: string]: number
}

interface ClassificationInfo {
  code: string
  minSalary: number
  maxSalary: number
  topSalary: number
  stepCount: number
  effectiveDate: string
}

type ComparisonType = 'top' | 'min' | 'max' | 'average'

const formatSalary = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

export default function EquivalencyPage() {
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [topSalaries, setTopSalaries] = useState<TopSalaries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [tolerancePercent, setTolerancePercent] = useState(6)
  const [comparisonType, setComparisonType] = useState<ComparisonType>('top')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use dynamic import to avoid including cache on server-side
        const { cachedFetch } = await import('../lib/api-cache')

        const [dataResponse, topResponse] = await Promise.all([
          cachedFetch('/api/data', undefined, 60), // Cache for 60 minutes
          cachedFetch('/api/top', undefined, 60),
        ])

        // The API returns { top: {...}, popular: [...] }
        const topData = topResponse?.top || {}

        setSalaryData(dataResponse)
        setTopSalaries(topData)
      } catch (err) {
        console.error(err)
        setError('Unable to load salary data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const allCodes = useMemo(
    () => (topSalaries ? Object.keys(topSalaries).sort((a, b) => a.localeCompare(b)) : []),
    [topSalaries]
  )

  const getClassificationInfo = useCallback((code: string): ClassificationInfo | null => {
    if (!salaryData || !salaryData[code] || !topSalaries || !topSalaries[code]) return null

    const rates = salaryData[code]['annual-rates-of-pay']
    if (!rates || !rates.length) return null

    const mostRecent = rates[rates.length - 1]
    const stepKeys = Object.keys(mostRecent).filter((key) => key.startsWith('step-'))
    if (!stepKeys.length) return null

    const sortedSteps = stepKeys.sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
    const min = Number(mostRecent[sortedSteps[0]])
    const max = Number(mostRecent[sortedSteps[sortedSteps.length - 1]])

    return {
      code,
      minSalary: Number.isFinite(min) ? min : 0,
      maxSalary: Number.isFinite(max) ? max : 0,
      topSalary: Number(topSalaries[code] ?? 0),
      stepCount: sortedSteps.length,
      effectiveDate: String(mostRecent['effective-date'] ?? ''),
    }
  }, [salaryData, topSalaries])

  const equivalentClassifications = useMemo(() => {
    if (!selectedCode) return []
    const targetInfo = getClassificationInfo(selectedCode)
    if (!targetInfo) return []

    const tolerance = targetInfo.topSalary * (tolerancePercent / 100)

    return allCodes
      .filter((code) => code !== selectedCode)
      .map((code) => getClassificationInfo(code))
      .filter((info): info is ClassificationInfo => info !== null)
      .filter((info) => {
        let baseline: number
        let compare: number

        switch (comparisonType) {
          case 'min':
            baseline = targetInfo.minSalary
            compare = info.minSalary
            break
          case 'max':
            baseline = targetInfo.maxSalary
            compare = info.maxSalary
            break
          case 'average':
            baseline = (targetInfo.minSalary + targetInfo.maxSalary) / 2
            compare = (info.minSalary + info.maxSalary) / 2
            break
          case 'top':
          default:
            baseline = targetInfo.topSalary
            compare = info.topSalary
            break
        }

        return compare >= baseline - tolerance && compare <= baseline + tolerance
      })
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [allCodes, comparisonType, selectedCode, tolerancePercent, getClassificationInfo])

  return (
    <>
      <Head>
        <title>Salary Equivalency Explorer</title>
        <meta
          name='description'
          content='Discover comparable Canadian public service classifications by salary tolerance.'
        />
      </Head>
      <div className='space-y-10'>
        <Card className='border border-content3/40 bg-content1/80'>
          <CardHeader className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
            <div className='space-y-2'>
              <Chip color='secondary' variant='flat' radius='sm' className='uppercase tracking-wide'>
                Equivalency explorer
              </Chip>
              <h1 className='text-3xl font-semibold text-foreground'>Compare salary classifications side by side</h1>
              <p className='max-w-2xl text-sm text-default-500'>
                Choose a reference classification, adjust tolerance, and discover other roles with comparable salary ranges.
              </p>
            </div>
            <div className='flex gap-2'>
              <Button as={ NextLink } href='/deployment' color='primary' variant='solid' size='sm' startContent={ <Deploy className="w-4 h-4" /> }>
                Check Deployment
              </Button>
              <Button as={ NextLink } href='/search' color='primary' variant='solid' size='sm' startContent={ <Search className="w-4 h-4" /> }>
                Back to Search
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className='border border-content3/40 bg-content1/80'>
          <CardBody className='space-y-6'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              <Autocomplete
                label='Reference classification'
                placeholder='Select a classification'
                variant='bordered'
                selectedKey={ selectedCode ?? undefined }
                onSelectionChange={ (key) => setSelectedCode(typeof key === 'string' ? key : null) }
              >
                { allCodes.map((code) => (
                  <AutocompleteItem key={ code }>{ code }</AutocompleteItem>
                )) }
              </Autocomplete>
              <Slider
                label={ `Tolerance (${tolerancePercent}%)` }
                step={ 1 }
                minValue={ 1 }
                maxValue={ 25 }
                value={ tolerancePercent }
                onChange={ (value) => setTolerancePercent(Number(value)) }
                className='md:col-span-2'
              />
              <div className='md:col-span-2 xl:col-span-4'>
                <Tabs
                  color='primary'
                  selectedKey={ comparisonType }
                  onSelectionChange={ (key) => setComparisonType(key as ComparisonType) }
                >
                  <Tab key='top' title='Top salary' />
                  <Tab key='max' title='Maximum' />
                  <Tab key='average' title='Average' />
                  <Tab key='min' title='Minimum' />
                </Tabs>
              </div>
            </div>

            <Divider className='bg-content3/40' />

            { loading ? (
              <div className='flex items-center justify-center py-16'>
                <Spinner color='primary' label='Loading equivalencies' />
              </div>
            ) : error ? (
              <Card className='border-danger-500/30 bg-danger-500/10'>
                <CardBody>
                  <p className='text-sm text-danger-200'>{ error }</p>
                </CardBody>
              </Card>
            ) : !selectedCode ? (
              <div className='space-y-2'>
                <h2 className='text-lg font-semibold text-foreground'>Select a classification to begin</h2>
                <p className='text-sm text-default-500'>
                  Use the picker above to choose a reference classification. We will highlight close matches inside the tolerance window.
                </p>
              </div>
            ) : (
              <div className='space-y-6'>
                <div className='flex flex-wrap gap-4'>
                  <Chip color='primary' variant='flat' radius='sm'>
                    Reference: { selectedCode }
                  </Chip>
                  <Chip variant='bordered' radius='sm'>
                    Tolerance ±{ tolerancePercent }%
                  </Chip>
                  <Chip variant='bordered' radius='sm'>
                    Metric: { comparisonType.toUpperCase() }
                  </Chip>
                </div>

                { equivalentClassifications.length === 0 ? (
                  <Card className='border border-content3/40 bg-content2/60'>
                    <CardBody className='space-y-2'>
                      <h3 className='text-lg font-semibold text-foreground'>No equivalent classifications found</h3>
                      <p className='text-sm text-default-500'>
                        Try increasing the tolerance, or switch to a different comparison metric to surface broader matches.
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                    { equivalentClassifications.map((info) => {
                      const target = selectedCode ? getClassificationInfo(selectedCode) : null
                      if (!target) return null

                      let baseline: number
                      let compare: number
                      switch (comparisonType) {
                        case 'min':
                          baseline = target.minSalary
                          compare = info.minSalary
                          break
                        case 'max':
                          baseline = target.maxSalary
                          compare = info.maxSalary
                          break
                        case 'average':
                          baseline = (target.minSalary + target.maxSalary) / 2
                          compare = (info.minSalary + info.maxSalary) / 2
                          break
                        case 'top':
                        default:
                          baseline = target.topSalary
                          compare = info.topSalary
                          break
                      }

                      const difference = compare - baseline
                      const percentDiff = baseline ? (difference / baseline) * 100 : 0

                      return (
                        <Card key={ info.code } className='border border-content3/40 bg-content2/60'>
                          <CardBody className='space-y-3'>
                            <div className='flex items-center justify-between'>
                              <Chip color='primary' variant='flat' radius='sm'>
                                { info.code }
                              </Chip>
                              <Chip
                                variant='flat'
                                color={
                                  Math.abs(percentDiff) <= 3
                                    ? 'success'
                                    : Math.abs(percentDiff) <= 7
                                      ? 'warning'
                                      : 'default'
                                }
                                radius='sm'
                              >
                                { percentDiff >= 0 ? '+' : '' }{ percentDiff.toFixed(1) }%
                              </Chip>
                            </div>
                            <div className='space-y-1 text-sm text-default-500'>
                              <p>
                                <span className='font-medium text-foreground'>Range:</span> { formatSalary(info.minSalary) } - { formatSalary(info.maxSalary) }
                              </p>
                              <p>
                                <span className='font-medium text-foreground'>Top salary:</span> { formatSalary(info.topSalary) }
                              </p>
                              <p>
                                <span className='font-medium text-foreground'>Steps:</span> { info.stepCount }
                              </p>
                              { info.effectiveDate && (
                                <p>
                                  <span className='font-medium text-foreground'>Effective:</span> { info.effectiveDate }
                                </p>
                              ) }
                            </div>
                            <Divider className='bg-content3/40' />
                            <div className='flex gap-2'>
                              <Button as={ NextLink } href={ `/api/${info.code.toLowerCase()}` } size='sm' color='primary' variant='solid' className='flex-1' startContent={ <External className="w-3 h-3" /> }>
                                API
                              </Button>
                              <Button
                                as={ NextLink }
                                href={ `/search?searchTerm=${encodeURIComponent(info.code)}` }
                                size='sm'
                                color='primary'
                                variant='solid'
                                className='flex-1'
                                startContent={ <Search className="w-3 h-3" /> }
                              >
                                Inspect
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      )
                    }) }
                  </div>
                ) }
              </div>
            ) }
          </CardBody>
        </Card>
      </div>
    </>
  )
}
