import { Helmet } from '@dr.pogodin/react-helmet';
import { type ReactElement } from 'react';
import { ScrollRestoration } from "react-router";
import Website from '@/layouts/Website';
interface RootLayoutProps {
  children: ReactElement;
}
export default function RootLayout({
  children
}: RootLayoutProps) {
  return <Website><Helmet><title>Wander</title><meta name="description" content="A calm shared space for planning trips together." /></Helmet><ScrollRestoration />{children}</Website>;
}
