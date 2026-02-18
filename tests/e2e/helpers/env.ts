export interface E2EEnv {
  enabled: boolean;
  server: string;
  apiKey: string;
  sender: string;
  receiver: string;
}

function required(name: string): string {
  return process.env[name]?.trim() || '';
}

export function getE2EEnv(): E2EEnv {
  return {
    enabled: process.env.MAILGOAT_E2E_ENABLED === 'true',
    server: required('MAILGOAT_E2E_SERVER'),
    apiKey: required('MAILGOAT_E2E_API_KEY'),
    sender: required('MAILGOAT_E2E_SENDER') || 'test-sender@test.mailgoat.ai',
    receiver: required('MAILGOAT_E2E_RECEIVER') || 'test-receiver@test.mailgoat.ai',
  };
}

export function hasRequiredE2EEnv(env: E2EEnv): boolean {
  return Boolean(env.enabled && env.server && env.apiKey && env.sender && env.receiver);
}
