import { PropsWithChildren } from 'react';
import AppNavbar from './AppNavbar';
import Footer from './Footer';

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}