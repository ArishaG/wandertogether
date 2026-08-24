import { RouteObject } from "react-router";
import { lazy } from 'react';
import HomePage from './pages/index';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/auth/AuthPage';
// Eager import so renderToString doesn't hit a Suspense boundary on 404 routes
// and abort to client rendering. The prod 404 page is tiny; the dev-tools
// variant stays lazy because it pulls in dev-only code we don't want in
// production bundles.
import ProdNotFoundPage from './pages/_404';
const NotFoundPage = ProdNotFoundPage;
export const routes: RouteObject[] = [{
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
  path: '/new-trip',
  element: <HomePage />
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
