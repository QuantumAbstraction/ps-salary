import { useMemo, useState } from 'react';
import Head from 'next/head';
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
  ScrollShadow,
  Skeleton,
  Spacer,
  type ChipProps,
} from '@heroui/react';

type SalaryEntry = {
  'annual-rates-of-pay': Array<{
    'effective-date': string;
    [key: string]: string | number;
  }>;
};

type SalaryMap = Record<string, SalaryEntry>;

interface GroupSummary {
  group: string;
  total: number;
  codes: string[];
}

interface ScraperResponse {
  success?: boolean;
  message?: string;
  newClassifications?: number;
  processedClassifications?: number;
  data?: SalaryMap;
  persistedTotal?: number;
  updatedAt?: string;
  groupSummary?: GroupSummary[];
  newCodes?: string[];
  error?: string;
  details?: string;
}

const buildGroupSummary = (payload?: SalaryMap | null): GroupSummary[] => {
  if (!payload) return [];
  const summary = new Map<string, Set<string>>();
  for (const rawCode of Object.keys(payload)) {
    if (!rawCode) continue;
    const normalizedCode = rawCode.toUpperCase();
    const groupMatch = normalizedCode.match(/^[A-Z]+/);
    const group = groupMatch ? groupMatch[0] : normalizedCode;
    if (!summary.has(group)) {
      summary.set(group, new Set());
    }
    summary.get(group)!.add(normalizedCode);
  }
  return Array.from(summary.entries())
    .map(([group, codes]) => ({
      group,
      total: codes.size,
      codes: Array.from(codes).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
};

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-CA')
    : '0';

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScraperResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupStats, setGroupStats] = useState<GroupSummary[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [persistedTotal, setPersistedTotal] = useState<number | null>(null);

  const statusMeta = useMemo(() => {
    if (isLoading) return { label: 'Running', color: 'warning' as ChipProps['color'] };
    if (error) return { label: 'Error', color: 'danger' as ChipProps['color'] };
    if (result) return { label: 'Completed', color: 'success' as ChipProps['color'] };
    return { label: 'Idle', color: 'default' as ChipProps['color'] };
  }, [error, isLoading, result]);

  const runScraper = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setGroupStats([]);

    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ScraperResponse = await response.json();

      if (response.ok) {
        setResult(data);
        setLastUpdated(data.updatedAt ?? null);
        setPersistedTotal(
          typeof data.persistedTotal === 'number' ? data.persistedTotal : null
        );

        const summary = data.groupSummary ?? buildGroupSummary(data.data);
        setGroupStats(summary);

        console.info('[admin] scraper summary', {
          processed:
            data.processedClassifications ??
            (data.data ? Object.keys(data.data).length : 0),
          newClassifications: data.newClassifications ?? 0,
          persistedTotal: data.persistedTotal ?? null,
        });

        if (summary.length) {
          console.table(summary.map(({ group, total }) => ({ group, total })));
        }
      } else {
        setError(data.error || data.details || data.message || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const newCodes = result?.newCodes ?? [];
  const processedThisRun =
    result?.processedClassifications ??
    (result?.data ? Object.keys(result.data).length : null);

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
  );

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
            <Chip color={statusMeta.color} variant="flat" radius="sm" className="uppercase tracking-wide">
              {statusMeta.label}
            </Chip>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                color="primary"
                size="lg"
                variant="shadow"
                onPress={runScraper}
                isLoading={isLoading}
              >
                Run Scraper
              </Button>
              {lastUpdated && (
                <Chip variant="bordered" color="secondary" radius="sm">
                  Last run: {formatTimestamp(lastUpdated)}
                </Chip>
              )}
              {persistedTotal !== null && (
                <Chip variant="bordered" radius="sm">
                  Stored records: {formatNumber(persistedTotal)}
                </Chip>
              )}
            </div>

            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3 rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
            )}

            {error && (
              <Card className="border-danger-500/40 bg-danger-500/10">
                <CardBody className="space-y-2">
                  <Chip color="danger" variant="flat" radius="sm" className="self-start uppercase">
                    Error
                  </Chip>
                  <p className="text-sm text-danger-200">{error}</p>
                </CardBody>
              </Card>
            )}

            {result && (
              <div className="space-y-6">
                {result.message && (
                  <Card className="border-primary-500/30 bg-primary-500/5">
                    <CardBody>
                      <p className="text-sm text-primary-200">{result.message}</p>
                    </CardBody>
                  </Card>
                )}

                <Divider className="bg-content3" />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {metricTiles.map((item) => (
                    <Card key={item.label} className="border border-content3/40 bg-content2/60">
                      <CardBody className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-default-400">{item.label}</p>
                        <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                        <p className="text-xs text-default-500">{item.helper}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {newCodes.length > 0 && (
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
                          {newCodes.map((code) => (
                            <Chip key={code} variant="flat" color="success" radius="sm">
                              {code}
                            </Chip>
                          ))}
                        </div>
                      </ScrollShadow>
                    </CardBody>
                  </Card>
                )}

                {groupStats.length > 0 && (
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
                          {groupStats.map((group) => (
                            <Card
                              key={group.group}
                              className="border border-content3/40 bg-content1/70"
                            >
                              <CardBody className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Chip size="sm" color="secondary" variant="flat" radius="sm">
                                    {group.group}
                                  </Chip>
                                  <span className="text-xs text-default-500">{group.total} codes</span>
                                </div>
                                <p className="text-xs leading-relaxed text-default-400">
                                  {group.codes.slice(0, 10).join(', ')}
                                  {group.codes.length > 10 && (
                                    <span className="text-default-500"> +{group.codes.length - 10} more</span>
                                  )}
                                </p>
                              </CardBody>
                            </Card>
                          ))}
                        </div>
                      </ScrollShadow>
                    </CardBody>
                  </Card>
                )}

                {result.data && Object.keys(result.data).length > 0 && (
                  <Accordion variant="bordered" defaultExpandedKeys={['raw']}
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
                        {JSON.stringify(result.data, null, 2)}
                      </Code>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Spacer y={4} />
      </div>
    </>
  );
}
