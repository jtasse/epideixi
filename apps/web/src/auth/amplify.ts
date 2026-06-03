import { Amplify } from 'aws-amplify';
import { env } from '@/config/env';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: env.cognito.userPoolId,
      userPoolClientId: env.cognito.userPoolClientId,
      loginWith: {
        oauth: {
          domain: env.cognito.domain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [env.cognito.redirectSignIn],
          redirectSignOut: [env.cognito.redirectSignOut],
          responseType: 'code',
          providers: ['Google'],
        },
      },
    },
  },
});
