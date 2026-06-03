function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy apps/web/.env.example to apps/web/.env and configure Cognito values from SAM outputs.`,
    );
  }
  return value;
}

/** Cognito Hosted UI hostname (not a URL path). Accepts prefix or full FQDN. */
function resolveCognitoOAuthDomain(raw: string, region: string): string {
  const host = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (host.includes('amazoncognito.com')) {
    return host;
  }
  return `${host}.auth.${region}.amazoncognito.com`;
}

const cognitoDomainRaw = requireEnv('VITE_COGNITO_DOMAIN');
const awsRegion = requireEnv('VITE_AWS_REGION');

export const env = {
  apiBaseUrl: requireEnv('VITE_API_BASE_URL'),
  cognito: {
    userPoolId: requireEnv('VITE_COGNITO_USER_POOL_ID'),
    userPoolClientId: requireEnv('VITE_COGNITO_USER_POOL_CLIENT_ID'),
    domain: resolveCognitoOAuthDomain(cognitoDomainRaw, awsRegion),
    redirectSignIn: requireEnv('VITE_COGNITO_REDIRECT_SIGN_IN'),
    redirectSignOut: requireEnv('VITE_COGNITO_REDIRECT_SIGN_OUT'),
  },
} as const;
