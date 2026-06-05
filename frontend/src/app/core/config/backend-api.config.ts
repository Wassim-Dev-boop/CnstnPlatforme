export interface ApiPageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const DEFAULT_API_GATEWAY_URL = 'http://localhost:8080';
const API_GATEWAY_URL_STORAGE_KEY = 'cnstn.apiGatewayUrl';
const TOKEN_STORAGE_KEYS = ['backend_access_token', 'auth_token', 'access_token'];
const DEFAULT_KEYCLOAK_BASE_URL = 'http://localhost:8090';
const KEYCLOAK_BASE_URL_STORAGE_KEY = 'cnstn.keycloakBaseUrl';
const DEFAULT_KEYCLOAK_REALM = 'cnstn-intranet';
const KEYCLOAK_REALM_STORAGE_KEY = 'cnstn.keycloakRealm';
const DEFAULT_KEYCLOAK_BROWSER_CLIENT_ID = 'cnstn-frontend-spa';
const KEYCLOAK_BROWSER_CLIENT_ID_STORAGE_KEY = 'cnstn.keycloakBrowserClientId';
const DEFAULT_KEYCLOAK_CLIENT_ID = 'cnstn-postman';
const KEYCLOAK_CLIENT_ID_STORAGE_KEY = 'cnstn.keycloakClientId';

function readStorageValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getApiGatewayBaseUrl(): string {
  const storedBaseUrl = readStorageValue(API_GATEWAY_URL_STORAGE_KEY)?.trim();
  if (storedBaseUrl) {
    return storedBaseUrl.replace(/\/+$/, '');
  }

  return DEFAULT_API_GATEWAY_URL;
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiGatewayBaseUrl()}${normalizedPath}`;
}

export function getKeycloakBaseUrl(): string {
  const storedBaseUrl = readStorageValue(KEYCLOAK_BASE_URL_STORAGE_KEY)?.trim();
  if (storedBaseUrl) {
    return storedBaseUrl.replace(/\/+$/, '');
  }

  return DEFAULT_KEYCLOAK_BASE_URL;
}

export function getKeycloakRealm(): string {
  const storedRealm = readStorageValue(KEYCLOAK_REALM_STORAGE_KEY)?.trim();
  return storedRealm || DEFAULT_KEYCLOAK_REALM;
}

export function getKeycloakClientId(): string {
  const storedClientId = readStorageValue(KEYCLOAK_CLIENT_ID_STORAGE_KEY)?.trim();
  return storedClientId || DEFAULT_KEYCLOAK_CLIENT_ID;
}

export function getKeycloakBrowserClientId(): string {
  const storedClientId = readStorageValue(KEYCLOAK_BROWSER_CLIENT_ID_STORAGE_KEY)?.trim();
  return storedClientId || DEFAULT_KEYCLOAK_BROWSER_CLIENT_ID;
}

export function getKeycloakTokenUrl(): string {
  return `${getKeycloakBaseUrl()}/realms/${getKeycloakRealm()}/protocol/openid-connect/token`;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function buildPkceChallenge(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return null;
  }

  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  const verifier = toBase64Url(randomBytes);

  const verifierBytes = new TextEncoder().encode(verifier);
  const digestBuffer = await window.crypto.subtle.digest('SHA-256', verifierBytes);
  return toBase64Url(new Uint8Array(digestBuffer));
}

export async function buildKeycloakRegisterUrl(redirectUri: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: getKeycloakBrowserClientId(),
    response_type: 'code',
    scope: 'openid',
    redirect_uri: redirectUri,
    kc_action: 'register',
  });

  const codeChallenge = await buildPkceChallenge();
  if (codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return `${getKeycloakBaseUrl()}/realms/${getKeycloakRealm()}/protocol/openid-connect/auth?${params.toString()}`;
}

export function hasBackendToken(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return TOKEN_STORAGE_KEYS.some((key) => !!window.localStorage.getItem(key)?.trim());
  } catch {
    return false;
  }
}

export function extractPageContent<T>(response: ApiPageResponse<T> | T[]): T[] {
  return Array.isArray(response) ? response : response.content ?? [];
}
