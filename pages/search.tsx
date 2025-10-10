import { useCallback, useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
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
  Spinner,
} from '@heroui/react'
import { Home, Filter, External } from '../components/Icons'

interface SalaryData {
  [key: string]: {
    'annual-rates-of-pay': Array<{
      'effective-date': string | null
      [stepKey: string]: string | number | null | undefined
    }>
  }
}

interface TopSalaries {
  [key: string]: number
}

interface SalaryInfo {
  effectiveDate: string | null
  stepCount: number
  minSalary: number
  maxSalary: number
}

export default function SearchPage() {
  const router = useRouter()
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null)
  const [minTopSalary, setMinTopSalary] = useState('')
  const [maxTopSalary, setMaxTopSalary] = useState('')
  const [minSteps, setMinSteps] = useState('')
  const [maxSteps, setMaxSteps] = useState('')
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [topSalaries, setTopSalaries] = useState<TopSalaries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dynamically load classifications from actual data instead of hardcoded array
  const classifications = useMemo(() => {
    return salaryData ? Object.keys(salaryData).sort() : []
  }, [salaryData])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { cachedFetch } = await import('../lib/api-cache')
        const [dataResponse, topResponse] = await Promise.all([
          cachedFetch('/api/data', undefined, 60),
          cachedFetch('/api/top', undefined, 60)
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

  // Handle searchTerm query parameter from URL
  useEffect(() => {
    if (router.isReady && router.query.searchTerm) {
      const searchTerm = router.query.searchTerm as string
      setSelectedClassification(searchTerm.toUpperCase())
    }
  }, [router.isReady, router.query.searchTerm])

  const formatSalary = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }, [])

  const getMostRecentSalaryInfo = useCallback((code: string): SalaryInfo | null => {
    if (!salaryData || !salaryData[code]) return null

    const rates = salaryData[code]['annual-rates-of-pay']
    if (!rates || rates.length === 0) return null

    const mostRecent = rates[rates.length - 1]
    const stepKeys = Object.keys(mostRecent)
      .filter(key => key.startsWith('step-'))
      .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))

    if (stepKeys.length === 0) return null

    const minSalary = mostRecent[stepKeys[0]]
    const maxSalary = mostRecent[stepKeys[stepKeys.length - 1]]

    return {
      effectiveDate: mostRecent['effective-date'],
      stepCount: stepKeys.length,
      minSalary: typeof minSalary === 'number' ? minSalary : Number(minSalary) || 0,
      maxSalary: typeof maxSalary === 'number' ? maxSalary : Number(maxSalary) || 0,
    }
  }, [salaryData])

  const filteredSalaryData = useMemo(() => {
    if (!salaryData) return []

    let filtered = Object.keys(salaryData)

    if (selectedClassification) {
      filtered = filtered.filter(key =>
        key.startsWith(selectedClassification.toUpperCase())
      )
    }

    if (minSteps !== '') {
      filtered = filtered.filter(key => {
        const info = getMostRecentSalaryInfo(key)
        return info && info.stepCount >= Number(minSteps)
      })
    }

    if (maxSteps !== '') {
      filtered = filtered.filter(key => {
        const info = getMostRecentSalaryInfo(key)
        return info && info.stepCount <= Number(maxSteps)
      })
    }

    if (minTopSalary !== '' && topSalaries) {
      filtered = filtered.filter(key => {
        const v = topSalaries[key]
        return typeof v === 'number' && !isNaN(v) && v >= Number(minTopSalary)
      })
    }

    if (maxTopSalary !== '' && topSalaries) {
      filtered = filtered.filter(key => {
        const v = topSalaries[key]
        return typeof v === 'number' && !isNaN(v) && v <= Number(maxTopSalary)
      })
    }

    return filtered.sort()
  }, [salaryData, selectedClassification, minSteps, maxSteps, minTopSalary, maxTopSalary, topSalaries, getMostRecentSalaryInfo])

  const filteredStats = useMemo(() => {
    if (filteredSalaryData.length === 0 || !topSalaries) return null

    const validSalaries = filteredSalaryData
      .map(code => topSalaries[code])
      .filter(val => typeof val === 'number' && !isNaN(val) && val > 0)

    if (validSalaries.length === 0) return null

    return {
      total: filteredSalaryData.length,
      highest: Math.max(...validSalaries),
      lowest: Math.min(...validSalaries),
      average: Math.round(validSalaries.reduce((a, b) => a + b, 0) / validSalaries.length)
    }
  }, [filteredSalaryData, topSalaries])

  const allCodes = useMemo(
    () => (salaryData ? Object.keys(salaryData).sort() : []),
    [salaryData]
  )

  if (loading) {
    return (
      <>
        <Head>
          <title>Advanced Search - PS Salary Data</title>
        </Head>
        <div className="flex h-96 items-center justify-center">
          <Spinner size="lg" label="Loading salary data..." />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Advanced Search - PS Salary Data</title>
        </Head>
        <Card className="border border-danger bg-danger-50">
          <CardBody>
            <p className="text-danger">{ error }</p>
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Advanced Search - PS Salary Data</title>
        <meta
          name="description"
          content="Search and filter Canadian public service salary data by classification, salary range, and number of steps."
        />
      </Head>

      <div className="space-y-10">
        {/* Header Card */ }
        <Card className="border border-content3/40 bg-content1/80">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Chip color="primary" variant="flat" radius="sm" className="uppercase tracking-wide">
                Advanced Search
              </Chip>
              <h1 className="text-3xl font-semibold text-foreground">
                Search Canadian public service salaries
              </h1>
              <p className="max-w-2xl text-sm text-default-500">
                Filter and explore salary data across 107+ classifications with advanced criteria including
                salary ranges, step counts, and classification families.
              </p>
            </div>
            <Button as={ NextLink } href="/" color="primary" variant="solid" size="sm" startContent={ <Home className="w-4 h-4" /> }>
              Back to Home
            </Button>
          </CardHeader>
        </Card>

        {/* Search and Filter Card */ }
        <Card className="border border-content3/40 bg-content1/80">
          <CardBody className="space-y-6">
            <div className="grid gap-4 md:grid-cols-1">
              <Autocomplete
                label="Classification Family"
                placeholder="Select classification family"
                variant="bordered"
                size="lg"
                selectedKey={ selectedClassification }
                onSelectionChange={ (key) => setSelectedClassification(key as string) }
                classNames={ {
                  base: 'w-full',
                } }
              >
                <AutocompleteItem key="" value="">
                  All Classifications
                </AutocompleteItem>
                { classifications.map(classification => (
                  <AutocompleteItem key={ classification } value={ classification }>
                    { classification }
                  </AutocompleteItem>
                )) }
              </Autocomplete>
            </div>

            <Divider />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Min Top Salary (CAD)"
                placeholder="e.g., 60000"
                variant="bordered"
                type="number"
                value={ minTopSalary }
                onValueChange={ setMinTopSalary }
                startContent={
                  <span className="text-default-400 text-small">$</span>
                }
              />

              <Input
                label="Max Top Salary (CAD)"
                placeholder="e.g., 120000"
                variant="bordered"
                type="number"
                value={ maxTopSalary }
                onValueChange={ setMaxTopSalary }
                startContent={
                  <span className="text-default-400 text-small">$</span>
                }
              />

              <Input
                label="Min Steps"
                placeholder="e.g., 5"
                variant="bordered"
                type="number"
                value={ minSteps }
                onValueChange={ setMinSteps }
              />

              <Input
                label="Max Steps"
                placeholder="e.g., 10"
                variant="bordered"
                type="number"
                value={ maxSteps }
                onValueChange={ setMaxSteps }
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-default-500">
                Showing <span className="font-semibold text-foreground">{ filteredSalaryData.length }</span> results
              </p>
              { (selectedClassification || minTopSalary || maxTopSalary || minSteps || maxSteps) && (
                <Button
                  size="sm"
                  variant="solid"
                  color="primary"
                  startContent={ <Filter className="w-4 h-4" /> }
                  onPress={ () => {
                    setSelectedClassification(null)
                    setMinTopSalary('')
                    setMaxTopSalary('')
                    setMinSteps('')
                    setMaxSteps('')
                  } }
                >
                  Clear Filters
                </Button>
              ) }
            </div>
          </CardBody>
        </Card>

        {/* Statistics Card */ }
        { filteredStats && (
          <Card className="border border-content3/40 bg-content1/80">
            <CardHeader>
              <h2 className="text-xl font-semibold text-foreground">Filtered Results Statistics</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-content2">
                  <CardBody className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      { filteredStats.total }
                    </div>
                    <div className="text-sm text-default-500">Classifications</div>
                  </CardBody>
                </Card>
                <Card className="bg-content2">
                  <CardBody className="text-center">
                    <div className="text-3xl font-bold text-success">
                      { formatSalary(filteredStats.highest) }
                    </div>
                    <div className="text-sm text-default-500">Highest Salary</div>
                  </CardBody>
                </Card>
                <Card className="bg-content2">
                  <CardBody className="text-center">
                    <div className="text-3xl font-bold text-warning">
                      { formatSalary(filteredStats.average) }
                    </div>
                    <div className="text-sm text-default-500">Average Salary</div>
                  </CardBody>
                </Card>
                <Card className="bg-content2">
                  <CardBody className="text-center">
                    <div className="text-3xl font-bold text-secondary">
                      { formatSalary(filteredStats.lowest) }
                    </div>
                    <div className="text-sm text-default-500">Lowest Salary</div>
                  </CardBody>
                </Card>
              </div>
            </CardBody>
          </Card>
        ) }

        {/* Results Grid */ }
        { filteredSalaryData.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            { filteredSalaryData.map(code => {
              const salaryInfo = getMostRecentSalaryInfo(code)
              const topSalary = topSalaries?.[code]

              return (
                <Card
                  key={ code }
                  className="border border-content3/40 bg-content1/80 hover:border-primary/50 transition-colors"
                >
                  <CardHeader className="flex flex-col items-start gap-2">
                    <div className="flex w-full items-center justify-between">
                      <h3 className="text-xl font-bold text-primary">{ code }</h3>
                      { topSalary && (
                        <Chip color="success" variant="flat" size="sm">
                          { formatSalary(topSalary) }
                        </Chip>
                      ) }
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    { salaryInfo && (
                      <>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-default-500">Salary Range:</span>
                            <span className="font-mono text-foreground">
                              { formatSalary(salaryInfo.minSalary) } - { formatSalary(salaryInfo.maxSalary) }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-default-500">Steps:</span>
                            <span className="font-semibold text-foreground">{ salaryInfo.stepCount }</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-default-500">Effective Date:</span>
                            <span className="text-foreground">{ salaryInfo.effectiveDate || 'N/A' }</span>
                          </div>
                        </div>

                        <Divider />

                        <div className="flex gap-2">
                          <Button
                            as="a"
                            href={ `/api/${code.toLowerCase()}` }
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="solid"
                            color="primary"
                            className="flex-1"
                            startContent={ <External className="w-3 h-3" /> }
                          >
                            Full Data
                          </Button>
                          <Button
                            as="a"
                            href={ `/api/${code.toLowerCase()}/current` }
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="solid"
                            color="primary"
                            className="flex-1"
                            startContent={ <External className="w-3 h-3" /> }
                          >
                            Current Steps
                          </Button>
                        </div>
                      </>
                    ) }
                  </CardBody>
                </Card>
              )
            }) }
          </div>
        ) : (
          <Card className="border border-content3/40 bg-content1/80">
            <CardBody className="py-16 text-center">
              <div className="space-y-2">
                <p className="text-xl font-semibold text-default-500">No results found</p>
                <p className="text-sm text-default-400">
                  Try adjusting your search terms or filters
                </p>
              </div>
            </CardBody>
          </Card>
        ) }
      </div>
    </>
  )
}
