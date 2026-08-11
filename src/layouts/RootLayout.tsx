import { Helmet } from '@dr.pogodin/react-helmet';
import { type ReactElement } from 'react';
import { ScrollRestoration, useLocation } from 'react-router-dom';

import Footer from '@/layouts/parts/Footer';
import Header from '@/layouts/parts/Header';
import Website from '@/layouts/Website';

/**
 * Root layout component that wraps all pages with consistent header and footer.
 *
 * To customize the header or footer, directly edit the Header.tsx and Footer.tsx
 * files in the layouts/parts directory.
 *
 * Site-wide <title> and <meta> live in the <Helmet> below. Individual pages can
 * override them by rendering their own <Helmet> — last-mounted wins.
 */
interface RootLayoutProps {
  children: ReactElement;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const location = useLocation();
  const isWorkspace = location.pathname === '/start-trip' || location.pathname === '/itinerary' || location.pathname === '/polls';

  return (
    <Website>
      <Helmet>
        <title>Wander.</title>
        <meta name="description" content="Plan trips together with Wander." />
      </Helmet>
      <ScrollRestoration />
      {!isWorkspace && <Header />}
      {children}
      {!isWorkspace && <Footer />}
    </Website>
  );
}
