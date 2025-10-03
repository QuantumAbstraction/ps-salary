import NextLink from 'next/link';
import { Button, Divider, Link } from '@heroui/react';

const primaryLinks = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Advanced Search' },
  { href: '/equivalency', label: 'Equivalency' },
  { href: '/admin', label: 'Admin Console' },
];

const externalLinks = [
  {
    href: 'https://github.com/dougkeefe/ps-salary-data',
    label: 'GitHub Repository',
  },
  {
    href: 'https://github.com/dougkeefe/ps-salary-data/blob/main/LICENSE',
    label: 'MIT License',
  },
  {
    href: 'https://www.tbs-sct.canada.ca/pubs_pol/hrpubs/coll_agre/rates-taux-eng.asp',
    label: 'Source (TBS-SCT Canada)',
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-content3/30 bg-background/95">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">About</h3>
            <p className="text-sm leading-relaxed text-default-500">
              The Public Servant Salary API aggregates publicly available pay data for Canadian public service
              classifications. Refresh the dataset via the admin console or explore real-time salary insights across
              hundreds of classifications.
            </p>
            <Button
              as={NextLink}
              href="/api/data"
              size="sm"
              variant="flat"
              color="primary"
              className="w-fit"
            >
              View API JSON
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Navigation</h3>
            <div className="grid gap-2">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  as={NextLink}
                  href={link.href}
                  color="foreground"
                  className="text-sm text-default-500 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Resources</h3>
            <div className="grid gap-2">
              {externalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="foreground"
                  className="text-sm text-default-500 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Divider className="bg-content3/40" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-default-500 sm:flex-row">
          <span>Doug Keefe &copy; 2023 &mdash; Maintained by Fabrice Ndizihiwe (2025)</span>
          <span>Built with HeroUI, Next.js, and Tailwind CSS.</span>
        </div>
      </div>
    </footer>
  );
}