import { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { setTokenProvider } from '../api/dataverse';

const SCOPES = [`${process.env.REACT_APP_PP_ENV_URL ?? ''}/.default`];

export function useTokenProvider() {
  const { instance, accounts } = useMsal();

  useEffect(() => {
    if (!accounts.length) return;
    setTokenProvider(async () => {
      try {
        const result = await instance.acquireTokenSilent({
          scopes: SCOPES,
          account: accounts[0],
        });
        return result.accessToken;
      } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
          const result = await instance.acquireTokenPopup({ scopes: SCOPES });
          return result.accessToken;
        }
        throw err;
      }
    });
  }, [instance, accounts]);
}
