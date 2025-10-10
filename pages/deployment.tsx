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
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from '@heroui/react'
import { Compare, Deploy } from '../components/Icons'

interface SalaryData {
    [key: string]: {
        'annual-rates-of-pay': Array<{
            'effective-date': string | null
            [key: string]: string | number | null | undefined
        }>
    }
}

interface DeploymentResult {
    fromCode: string
    toCode: string
    fromMaxSalary: number
    toMaxSalary: number
    minIncrement: number
    salaryDifference: number
    isDeployable: boolean
    reason: string
    fromStepCount: number
    toStepCount: number
}

const formatSalary = (amount: number) =>
    new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)

export default function DeploymentPage() {
    const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [fromCode, setFromCode] = useState<string | null>(null)
    const [toCode, setToCode] = useState<string | null>(null)
    const [result, setResult] = useState<DeploymentResult | null>(null)
    const [calculating, setCalculating] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { cachedFetch } = await import('../lib/api-cache')
                const dataResult = await cachedFetch('/api/data', undefined, 60)
                setSalaryData(dataResult)
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
        () => (salaryData ? Object.keys(salaryData).sort((a, b) => a.localeCompare(b)) : []),
        [salaryData]
    )

    const extractSteps = useCallback((rates: any) => {
        if (!rates || !rates.length) return []

        const mostRecent = rates[rates.length - 1]
        const stepKeys = Object.keys(mostRecent).filter((key) => key.startsWith('step-'))

        return stepKeys
            .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
            .map((key) => Number(mostRecent[key]))
            .filter((val) => Number.isFinite(val) && val > 0)
    }, [])

    const calculateDeployment = useCallback(() => {
        if (!fromCode || !toCode || !salaryData) {
            return
        }

        setCalculating(true)

        setTimeout(() => {
            const fromData = salaryData[fromCode.toUpperCase()]
            const toData = salaryData[toCode.toUpperCase()]

            if (!fromData || !toData) {
                setResult({
                    fromCode: fromCode.toUpperCase(),
                    toCode: toCode.toUpperCase(),
                    fromMaxSalary: 0,
                    toMaxSalary: 0,
                    minIncrement: 0,
                    salaryDifference: 0,
                    isDeployable: false,
                    reason: 'One or both classification codes not found in the database.',
                    fromStepCount: 0,
                    toStepCount: 0,
                })
                setCalculating(false)
                return
            }

            const fromSteps = extractSteps(fromData['annual-rates-of-pay'])
            const toSteps = extractSteps(toData['annual-rates-of-pay'])

            if (!fromSteps.length || !toSteps.length) {
                setResult({
                    fromCode: fromCode.toUpperCase(),
                    toCode: toCode.toUpperCase(),
                    fromMaxSalary: 0,
                    toMaxSalary: 0,
                    minIncrement: 0,
                    salaryDifference: 0,
                    isDeployable: false,
                    reason: 'No valid salary steps found for one or both classifications.',
                    fromStepCount: fromSteps.length,
                    toStepCount: toSteps.length,
                })
                setCalculating(false)
                return
            }

            // Step 1: Calculate minimum inter-step increment
            let minIncrement = Infinity
            for (let i = 0; i < fromSteps.length - 1; i++) {
                const increment = fromSteps[i + 1] - fromSteps[i]
                if (increment < minIncrement) {
                    minIncrement = increment
                }
            }

            // Handle single-step classifications
            if (minIncrement === Infinity || fromSteps.length === 1) {
                minIncrement = 0
            }

            // Step 2: Get maximum salaries
            const fromMaxSalary = fromSteps[fromSteps.length - 1]
            const toMaxSalary = toSteps[toSteps.length - 1]

            // Step 3: Calculate difference
            const salaryDifference = toMaxSalary - fromMaxSalary

            // Step 4: Determine deployability
            const isDeployable = Math.abs(salaryDifference) < minIncrement

            let reason = ''
            if (fromSteps.length === 1) {
                reason = `Note: ${fromCode.toUpperCase()} has only one step. Deployment eligibility cannot be determined using standard increment rules.`
            } else if (isDeployable) {
                reason = `✓ Deployment allowed: The salary difference (${formatSalary(Math.abs(salaryDifference))}) is less than the minimum step increment (${formatSalary(minIncrement)}) in ${fromCode.toUpperCase()}.`
            } else {
                reason = `✗ Deployment not allowed: The salary difference (${formatSalary(Math.abs(salaryDifference))}) exceeds the minimum step increment (${formatSalary(minIncrement)}) in ${fromCode.toUpperCase()}.`
            }

            setResult({
                fromCode: fromCode.toUpperCase(),
                toCode: toCode.toUpperCase(),
                fromMaxSalary,
                toMaxSalary,
                minIncrement,
                salaryDifference,
                isDeployable: fromSteps.length === 1 ? false : isDeployable,
                reason,
                fromStepCount: fromSteps.length,
                toStepCount: toSteps.length,
            })
            setCalculating(false)
        }, 300)
    }, [fromCode, toCode, salaryData, extractSteps])

    if (loading) {
        return (
            <>
                <Head>
                    <title>Deployment Eligibility Calculator</title>
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
                    <title>Deployment Eligibility Calculator</title>
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
                <title>Deployment Eligibility Calculator</title>
                <meta
                    name="description"
                    content="Determine deployment eligibility between public service classifications using Treasury Board inter-step increment rules."
                />
            </Head>

            <div className="space-y-10">
                {/* Header Card */ }
                <Card className="border border-content3/40 bg-content1/80">
                    <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <Chip color="primary" variant="flat" radius="sm" className="uppercase tracking-wide">
                                Deployment Eligibility
                            </Chip>
                            <h1 className="text-3xl font-semibold text-foreground">
                                Check deployment eligibility between classifications
                            </h1>
                            <p className="max-w-2xl text-sm text-default-500">
                                Determine if an employee can be deployed from one classification to another using
                                Treasury Board&apos;s inter-step increment methodology.
                            </p>
                        </div>
                        <Button as={ NextLink } href="/equivalency" color="primary" variant="solid" size="sm" startContent={ <Compare className="w-4 h-4" /> }>
                            Compare Equivalencies
                        </Button>
                    </CardHeader>
                </Card>

                {/* Selection Card */ }
                <Card className="border border-content3/40 bg-content1/80">
                    <CardBody className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Autocomplete
                                label="From Classification"
                                placeholder="Select source classification"
                                variant="bordered"
                                size="lg"
                                selectedKey={ fromCode }
                                onSelectionChange={ (key) => setFromCode(key as string) }
                                isDisabled={ calculating }
                                classNames={ {
                                    base: 'w-full',
                                } }
                            >
                                { allCodes.map((code) => (
                                    <AutocompleteItem key={ code }>
                                        { code }
                                    </AutocompleteItem>
                                )) }
                            </Autocomplete>

                            <Autocomplete
                                label="To Classification"
                                placeholder="Select target classification"
                                variant="bordered"
                                size="lg"
                                selectedKey={ toCode }
                                onSelectionChange={ (key) => setToCode(key as string) }
                                isDisabled={ calculating }
                                classNames={ {
                                    base: 'w-full',
                                } }
                            >
                                { allCodes.map((code) => (
                                    <AutocompleteItem key={ code }>
                                        { code }
                                    </AutocompleteItem>
                                )) }
                            </Autocomplete>
                        </div>

                        <Button
                            color="primary"
                            size="lg"
                            variant="solid"
                            className="w-full font-semibold sm:w-auto"
                            onPress={ calculateDeployment }
                            isDisabled={ !fromCode || !toCode || calculating }
                            isLoading={ calculating }
                            startContent={ !calculating ? <Deploy className="w-4 h-4" /> : undefined }
                        >
                            { calculating ? 'Calculating...' : 'Check Eligibility' }
                        </Button>
                    </CardBody>
                </Card>

                {/* Results Card */ }
                { result && !calculating && (
                    <Card
                        className={ `border-2 ${result.isDeployable
                            ? 'border-success bg-success-50/50 dark:bg-success-950/20'
                            : 'border-danger bg-danger-50/50 dark:bg-danger-950/20'
                            }` }
                    >
                        <CardBody className="space-y-6">
                            {/* Result Header */ }
                            <div className="flex items-start gap-4">
                                <div
                                    className={ `flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-4xl ${result.isDeployable
                                        ? 'bg-success text-success-foreground'
                                        : 'bg-danger text-danger-foreground'
                                        }` }
                                >
                                    { result.isDeployable ? '✓' : '✗' }
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h2 className="text-2xl font-bold text-foreground">
                                        { result.isDeployable ? 'Deployment Allowed' : 'Deployment Not Allowed' }
                                    </h2>
                                    <p className="text-lg text-default-700">
                                        { result.fromCode } → { result.toCode }
                                    </p>
                                </div>
                            </div>

                            <Divider />

                            {/* Explanation */ }
                            <div className="rounded-lg bg-content1 p-4">
                                <p className="text-sm leading-relaxed text-default-700">{ result.reason }</p>
                            </div>

                            <Divider />

                            {/* Details Table */ }
                            <div className="overflow-x-auto">
                                <Table
                                    aria-label="Deployment calculation details"
                                    removeWrapper
                                    classNames={ {
                                        base: 'bg-transparent',
                                        th: 'bg-content2 text-default-600 font-semibold',
                                        td: 'text-foreground',
                                    } }
                                >
                                    <TableHeader>
                                        <TableColumn>Metric</TableColumn>
                                        <TableColumn>Value</TableColumn>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                { result.fromCode } Maximum Salary
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                { formatSalary(result.fromMaxSalary) }
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                { result.fromCode } Step Count
                                            </TableCell>
                                            <TableCell>{ result.fromStepCount }</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                { result.toCode } Maximum Salary
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                { formatSalary(result.toMaxSalary) }
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                { result.toCode } Step Count
                                            </TableCell>
                                            <TableCell>{ result.toStepCount }</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Salary Difference</TableCell>
                                            <TableCell
                                                className={ `font-mono ${result.salaryDifference >= 0 ? 'text-success' : 'text-danger'
                                                    }` }
                                            >
                                                { result.salaryDifference >= 0 ? '+' : '' }
                                                { formatSalary(Math.abs(result.salaryDifference)) }
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                Minimum Step Increment ({ result.fromCode })
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                { formatSalary(result.minIncrement) }
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Deployment Decision</TableCell>
                                            <TableCell>
                                                <Chip
                                                    color={ result.isDeployable ? 'success' : 'danger' }
                                                    variant="flat"
                                                    size="sm"
                                                >
                                                    { result.isDeployable ? 'ALLOWED' : 'NOT ALLOWED' }
                                                </Chip>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>
                ) }

                {/* Explanation Card */ }
                <Card className="border border-content3/40 bg-content1/80">
                    <CardHeader>
                        <h3 className="text-xl font-semibold text-foreground">How Deployment Eligibility Works</h3>
                    </CardHeader>
                    <CardBody className="space-y-4 text-sm text-default-700">
                        <p>
                            <strong>Deployment eligibility</strong> is determined by comparing the minimum
                            inter-step increment within the source classification against the difference between
                            maximum salaries of both classifications.
                        </p>

                        <div className="space-y-2 rounded-lg bg-content2 p-4">
                            <h4 className="font-semibold text-foreground">Calculation Steps:</h4>
                            <ol className="list-inside list-decimal space-y-2 pl-2">
                                <li>
                                    Calculate the <strong>minimum inter-step increment</strong> in the source
                                    classification (the smallest salary jump between consecutive steps)
                                </li>
                                <li>
                                    Find the <strong>maximum salaries</strong> for both classifications (top step)
                                </li>
                                <li>
                                    Calculate the <strong>difference</strong> between the two maximum salaries
                                </li>
                                <li>
                                    If the absolute difference is <strong>less than</strong> the minimum increment,
                                    deployment is allowed
                                </li>
                            </ol>
                        </div>

                        <div className="rounded-lg border border-primary/40 bg-primary-50/50 p-4 dark:bg-primary-950/20">
                            <p className="text-sm">
                                <strong>Formula:</strong> |Maximum Salary (To) - Maximum Salary (From)| &lt; Minimum
                                Increment (From)
                            </p>
                        </div>

                        <Divider />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-foreground">Key Differences:</h4>
                            <Table
                                aria-label="Comparison methods"
                                removeWrapper
                                classNames={ {
                                    th: 'bg-content2',
                                } }
                            >
                                <TableHeader>
                                    <TableColumn>Method</TableColumn>
                                    <TableColumn>Use Case</TableColumn>
                                    <TableColumn>Tolerance</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Deployment</TableCell>
                                        <TableCell>Permanent lateral moves</TableCell>
                                        <TableCell>Inter-step increment</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">
                                            <NextLink href="/equivalency" className="text-primary hover:underline">
                                                Equivalency
                                            </NextLink>
                                        </TableCell>
                                        <TableCell>Temporary assignments</TableCell>
                                        <TableCell>Percentage-based (4-6%)</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <p className="pt-2 text-xs text-default-500">
                            <strong>Note:</strong> This calculator uses Treasury Board of Canada Secretariat
                            guidelines for deployment eligibility. Always consult with your HR advisor for
                            official determinations.
                        </p>
                    </CardBody>
                </Card>
            </div>
        </>
    )
}
