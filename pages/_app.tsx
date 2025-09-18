
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Public Servant Salary API</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow">
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </>
  );
}
