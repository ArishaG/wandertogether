import type { Plugin } from 'vite';

export function errorInterceptorPlugin(): Plugin {
  return { name: 'error-interceptor-stub' };
}
