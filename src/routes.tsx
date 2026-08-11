import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import HomePage from './pages/index';
import DashboardPage from './pages/dashboard';
import StartTripPage from './pages/start-trip';
import PollsPage from './pages/polls';
import ItineraryPage from './pages/itinerary';
import TripsPage from './pages/trips';
import MyTripsPage from './pages/my-trips';
import AuthPage from './pages/auth/AuthPage';
import { ProtectedRoute } from './lib/auth/auth-client';
// Eager import so renderToString doesn't hit a Suspense boundary on 404 routes
// and abort to client rendering. The prod 404 page is tiny; the dev-tools
// variant stays lazy because it pulls in dev-only code we don't want in
// production bundles.
import ProdNotFoundPage from './pages/_404';

const NotFoundPage = import.meta.env.DEV
  ? lazy(() => import('../dev-tools/src/PageNotFound'))
  : ProdNotFoundPage;

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <AuthPage mode="login" />,
  },
  {
    path: '/signup',
    element: <AuthPage mode="signup" />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: '/trips',
    element: <ProtectedRoute><TripsPage /></ProtectedRoute>,
  },
  {
    path: '/my-trips',
    element: <MyTripsPage />,
  },
  {
    path: '/start-trip',
    element: <StartTripPage />,
  },
  {
    path: '/polls',
    element: <PollsPage />,
  },
  {
    path: '/itinerary',
    element: <ItineraryPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

// Types for type-safe navigation
export type Path = '/' | '/login' | '/signup' | '/dashboard' | '/trips' | '/my-trips' | '/start-trip' | '/polls' | '/itinerary';

export type Params = Record<string, string | undefined>;
