import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export const DUPLICATE_EMAIL_MESSAGE =
  'An account associated with this email already exists. Please sign in with your existing method instead.';

const client = new CognitoIdentityProviderClient({});

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function escapeFilterValue(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function findUsersByEmail(userPoolId, email) {
  const { Users } = await client.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${escapeFilterValue(email)}"`,
      Limit: 1,
    }),
  );
  return Users ?? [];
}

/**
 * @param {import('aws-lambda').PreSignUpTriggerEvent} event
 */
export async function handler(event) {
  const email = normalizeEmail(event.request?.userAttributes?.email);
  if (!email) {
    return event;
  }

  const trigger = event.triggerSource;
  if (
    trigger !== 'PreSignUp_SignUp' &&
    trigger !== 'PreSignUp_ExternalProvider'
  ) {
    return event;
  }

  const existing = await findUsersByEmail(event.userPoolId, email);
  if (existing.length > 0) {
    throw new Error(DUPLICATE_EMAIL_MESSAGE);
  }

  return event;
}
