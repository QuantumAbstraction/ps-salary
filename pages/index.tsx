import { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import Head from 'next/head';
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
} from '@heroui/react';

interface SalaryData {
  [key: string]: {
    'annual-rates-of-pay': Array<{
      'effective-date': string | null;
      [stepKey: string]: string | number | null | undefined;
    }>;
  };
}

interface TopSalaries {
  [key: string]: number;
}

interface MetricTile {
  label: string;
  value: string;
  helper: string;
}

const formatSalary = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export default function Home() {
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [topSalaries, setTopSalaries] = useState<TopSalaries | null>(null);
  const [popularList, setPopularList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use dynamic import to avoid including cache on server-side
        const { cachedFetch } = await import('../lib/api-cache');
        
        const [dataResult, topResult] = await Promise.all([
          cachedFetch('/api/data', undefined, 60), // Cache for 60 minutes
          cachedFetch('/api/top', undefined, 60),
        ]);
        const normalizedTop: TopSalaries = topResult?.top ?? topResult ?? {};

        setSalaryData(dataResult);
        setTopSalaries(normalizedTop);
        setPopularList(topResult?.popular ?? []);
      } catch (error) {
        console.error('Failed to load salary data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const allCodes = useMemo(
    () => (salaryData ? Object.keys(salaryData).sort((a, b) => a.localeCompare(b)) : []),
    [salaryData]
  );

  const stats = useMemo(() => {
    if (!topSalaries) return null;

    const values = Object.values(topSalaries).filter((value): value is number => typeof value === 'number');
    if (!values.length) return null;

    const totalCodes = values.length;
    const highest = Math.max(...values);
    const lowest = Math.min(...values);
    const average = Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);

    const tiles: MetricTile[] = [
      {
        label: 'Total classifications',
        value: totalCodes.toLocaleString('en-CA'),
        helper: 'Unique classification codes loaded from the dataset.',
      },
      {
        label: 'Highest top salary',
        value: formatSalary(highest),
        helper: 'Maximum annual top-step salary recorded.',
      },
      {
        label: 'Average top salary',
        value: formatSalary(average),
        helper: 'Mean of all top-step salaries in the dataset.',
      },
      {
        label: 'Lowest top salary',
        value: formatSalary(lowest),
        helper: 'Minimum annual top-step salary recorded.',
      },
    ];

    return tiles;
  }, [topSalaries]);

  const getMostRecentSalaryInfo = useCallback((code: string) => {
    if (!salaryData || !salaryData[code]) return null;

    const rates = salaryData[code]['annual-rates-of-pay'];
    if (!rates || rates.length === 0) return null;

    const mostRecent = rates[rates.length - 1];
    const steps = Object.keys(mostRecent).filter(key => key.startsWith('step-'));
    const stepCount = steps.length;
    const minSalary = mostRecent[steps[0]];
    const maxSalary = mostRecent[steps[steps.length - 1]];

    return {
      effectiveDate: mostRecent['effective-date'],
      stepCount,
      minSalary: typeof minSalary === 'number' ? minSalary : parseInt(minSalary as string),
      maxSalary: typeof maxSalary === 'number' ? maxSalary : parseInt(maxSalary as string),
    };
  }, [salaryData]);

    const allClassifications = useMemo(() => {
    if (!salaryData) return [];
    return Object.keys(salaryData).sort((a, b) => a.localeCompare(b));
  }, [salaryData]);

  const quickResults = allClassifications.slice(0, 8);

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
                <Button as={NextLink} href='/search' color='primary' size='md' variant='shadow'>
                  Advanced Search
                </Button>
                <Button as={NextLink} href='/equivalency' color='secondary' size='md' variant='flat'>
                  Find Equivalencies
                </Button>
                <Button as={NextLink} href='/admin' size='md' variant='bordered'>
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
                  {(popularList.length ? popularList : ['IT', 'AS', 'PM', 'EC', 'FI', 'IS']).map((code) => (
                    <Chip
                      key={code}
                      variant='flat'
                      color='primary'
                      className='cursor-pointer'
                      as={NextLink}
                      href={`/search?searchTerm=${encodeURIComponent(code)}`}
                    >
                      {code}
                    </Chip>
                  ))}
                </div>
                <Divider className='bg-content3/40' />
                <div className='space-y-2 text-xs text-default-500'>
                  <p>Need raw data? The API is open:</p>
                  <Button as={NextLink} href='/api/data' size='sm' variant='bordered' className='w-fit'>
                    View JSON payload
                  </Button>
                </div>
              </CardBody>
            </Card>
          </CardBody>
        </Card>

        {stats && (
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {stats.map((metric) => (
              <Card key={metric.label} className='border border-content3/40 bg-content1/80'>
                <CardBody className='space-y-2'>
                  <p className='text-xs uppercase tracking-wide text-default-500'>{metric.label}</p>
                  <p className='text-2xl font-semibold text-foreground'>{metric.value}</p>
                  <p className='text-xs text-default-500'>{metric.helper}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}



        <Card className='border border-content3/40 bg-content1/80'>
          <CardHeader className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-foreground'>Classification overview</h2>
              <p className='text-sm text-default-500'>
                {allClassifications.length.toLocaleString('en-CA')} classifications available.
              </p>
            </div>
          </CardHeader>
          <Divider className='bg-content3/40' />
          {loading ? (
            <div className='flex items-center justify-center p-16'>
              <Spinner color='primary' label='Loading salary data' />
            </div>
          ) : (
            <CardBody className='space-y-8'>
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                {quickResults.map((code) => {
                  const info = getMostRecentSalaryInfo(code);
                  const top = topSalaries?.[code];

                  return (
                    <Card key={code} className='border border-content3/30 bg-content2/60'>
                      <CardBody className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <Chip color='primary' variant='flat' radius='sm'>
                            {code}
                          </Chip>
                          {top ? (
                            <span className='text-sm font-medium text-foreground'>{formatSalary(top)}</span>
                          ) : null}
                        </div>
                        {info ? (
                          <div className='space-y-1 text-xs text-default-500'>
                            <p>Range: {formatSalary(info.minSalary)} - {formatSalary(info.maxSalary)}</p>
                            <p>Steps: {info.stepCount}</p>
                            {info.effectiveDate && <p>Effective: {info.effectiveDate}</p>}
                          </div>
                        ) : (
                          <p className='text-xs text-default-500'>No recent salary information.</p>
                        )}
                        <div className='flex gap-2 pt-2'>
                          <Button
                            as={NextLink}
                            href={`/api/${code.toLowerCase()}`}
                            size='sm'
                            variant='bordered'
                            className='flex-1'
                          >
                            API
                          </Button>
                          <Button
                            as={NextLink}
                            href={`/search?searchTerm=${encodeURIComponent(code)}`}
                            size='sm'
                            color='primary'
                            variant='flat'
                            className='flex-1'
                          >
                            Explore
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>

              <Table aria-label='Classification salary table' className='border border-content3/40' removeWrapper>
                <TableHeader>
                  <TableColumn key='code'>Classification</TableColumn>
                  <TableColumn key='range'>Salary range</TableColumn>
                  <TableColumn key='top'>Top salary</TableColumn>
                  <TableColumn key='steps'>Steps</TableColumn>
                  <TableColumn key='effective'>Effective date</TableColumn>
                  <TableColumn key='actions'>Actions</TableColumn>
                </TableHeader>
                <TableBody
                  emptyContent={
                    loading
                      ? 'Loading classifications...'
                      : 'No classifications available.'
                  }
                >
                  {allClassifications.map((code) => {
                    const info = getMostRecentSalaryInfo(code);
                    const top = topSalaries?.[code];
                    return (
                      <TableRow key={code}>
                        <TableCell>
                          <span className='font-semibold text-foreground'>{code}</span>
                        </TableCell>
                        <TableCell>
                          {info ? (
                            <span className='text-sm text-default-500'>
                              {formatSalary(info.minSalary)} - {formatSalary(info.maxSalary)}
                            </span>
                          ) : (
                            <span className='text-xs text-default-500'>Unavailable</span>
                          )}
                        </TableCell>
                        <TableCell>{top ? formatSalary(top) : '—'}</TableCell>
                        <TableCell>{info?.stepCount ?? '—'}</TableCell>
                        <TableCell>{info?.effectiveDate ?? '—'}</TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button
                              as={NextLink}
                              href={`/api/${code.toLowerCase()}`}
                              size='sm'
                              variant='light'
                            >
                              API
                            </Button>
                            <Button
                              as={NextLink}
                              href={`/search?searchTerm=${encodeURIComponent(code)}`}
                              size='sm'
                              variant='flat'
                              color='primary'
                            >
                              Inspect
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}




