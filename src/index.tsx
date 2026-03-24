import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider } from '@fluentui/react-components';
import { p3Theme } from './theme/p3Theme';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import App from './App';

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID ?? '',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID ?? 'common'}`,
    redirectUri: window.location.origin,
  },
};

const pca = new PublicClientApplication(msalConfig);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <MsalProvider instance={pca}>
      <FluentProvider theme={p3Theme}>
        <App />
      </FluentProvider>
    </MsalProvider>
  </React.StrictMode>
);
