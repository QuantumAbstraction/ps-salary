import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider } from '../components/theme-provider';
import AppShell from '../components/AppShell';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      disableTransitionOnChange={false}
      storageKey="ps-salary-theme"
    >
      <HeroUIProvider>
        <Head>
          <title>Public Servant Salary API</title>
        </Head>
        <AppShell>
          <Component {...pageProps} />
        </AppShell>
        <Analytics />
      </HeroUIProvider>
    </ThemeProvider>
  );
}