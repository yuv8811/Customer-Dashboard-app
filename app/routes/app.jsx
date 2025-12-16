import { NavMenu } from "@shopify/app-bridge-react";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import translations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={translations}>
        <NavMenu>
          <a href="/app" rel="home">Home</a>
          <a href="/app/customer">Customer</a>
          <a href="/app/product">Product</a>
          <a href="/app/order">Order</a>
          <a href="/app/store-health">Store Health</a>
          <a href="/app/pricing">Pricing</a>
        </NavMenu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
