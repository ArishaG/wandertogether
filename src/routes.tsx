import { RouteObject } from "react-router";

import HomePage from './pages/index';
import ProfilePage from './pages/ProfilePage';
import AccountPage from './pages/AccountPage';
import PublicProfilePage from './pages/PublicProfilePage';
import AuthPage from './pages/auth/AuthPage';
import InvitePage from './pages/InvitePage';
// Eager import so renderToString doesn't hit a Suspense boundary on 404 routes
// and abort to client rendering. The prod 404 page is tiny; the dev-tools
// variant stays lazy because it pulls in dev-only code we don't want in
// production bundles.
import ProdNotFoundPage from './pages/_404';
const NotFoundPage = ProdNotFoundPage;
export const routes: RouteObject[] = [{
  path: '/people/:id',
  element: <PublicProfilePage />
}, {
  path: '/',
  element: <HomePage />
}, {
  path: '/login',
  element: <AuthPage mode="login" />
}, {
  path: '/signup',
  element: <AuthPage mode="signup" />
}, {
  path: '/profile',
  element: <ProfilePage />
}, {
  path: '/trips',
  element: <ProfilePage />
}, {
  path: '/account',
  element: <AccountPage />
}, {
  path: '/new-trip',
  element: <HomePage />
}, {
  path: '/invite/:token',
  element: <InvitePage />
}, {
  path: '/trip/:id',
  element: <HomePage />
}, {
  path: '*',
  element: <NotFoundPage />
}];

// Types for type-safe navigation
export type Path = '/';
export type Params = Record<string, string | undefined>;
