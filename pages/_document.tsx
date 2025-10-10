import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang='en' suppressHydrationWarning>
      <Head />
      <body className='bg-background text-foreground' suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}