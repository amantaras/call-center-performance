import { AzureServicesConfig } from '@/types/config';

const COOKIE_NAME = 'ccp_azure_config';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function saveAzureConfigCookie(config: AzureServicesConfig) {
  if (!isBrowser()) return;
  try {
    const encoded = encodeURIComponent(btoa(JSON.stringify(config)));
    document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  } catch (error) {
    console.warn('Failed to write Azure config cookie', error);
  }
}

export function loadAzureConfigFromCookie(): AzureServicesConfig | null {
  if (!isBrowser()) return null;
  try {
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const target = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!target) return null;
    const value = target.split('=')[1];
    if (!value) return null;
    const decoded = atob(decodeURIComponent(value));
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to read Azure config cookie', error);
    return null;
  }
}

export function clearAzureConfigCookie() {
  if (!isBrowser()) return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
