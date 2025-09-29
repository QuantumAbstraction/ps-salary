import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import Footer from '../components/Footer';
import { Analytics } from '@vercel/analytics/react';
import { HeroUIProvider } from '@heroui/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <HeroUIProvider>
      <Head>
        <title>Public Servant Salary API</title>
      </Head>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <main className="flex-grow">
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
      <Analytics />
    </HeroUIProvider>
  );
}
