import { Page, Layout, Card, BlockStack, Text, InlineGrid, Button, Icon } from "@shopify/polaris";
import { PersonIcon, OrderIcon, HeartIcon } from "@shopify/polaris-icons";

export default function Index() {
  return (
    <Page title="Dashboard Overview">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Welcome to your Customer Dashboard</Text>
                <Text variant="bodyMd" as="p">
                  Gain insights into your customers, orders, and overall store health. Select a module below to get started.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <InlineGrid columns={['oneThird', 'oneThird', 'oneThird']} gap="400">

              <Card>
                <BlockStack gap="400">
                  <InlineGrid columns="auto 1fr" gap="400" alignItems="center">
                    <div style={{ background: '#f1f2f4', padding: '12px', borderRadius: '8px' }}>
                      <Icon source={PersonIcon} tone="base" />
                    </div>
                    <Text variant="headingSm" as="h3">Customers</Text>
                  </InlineGrid>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Filter by tags, country, and activity. Export segmented lists.
                  </Text>
                  <div style={{ marginTop: 'auto' }}>
                    <Button url="/app/customer" variant="primary" fullWidth>View Customers</Button>
                  </div>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineGrid columns="auto 1fr" gap="400" alignItems="center">
                    <div style={{ background: '#f1f2f4', padding: '12px', borderRadius: '8px' }}>
                      <Icon source={OrderIcon} tone="base" />
                    </div>
                    <Text variant="headingSm" as="h3">Orders</Text>
                  </InlineGrid>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Analyze order patterns, cancellations, and high-risk transactions.
                  </Text>
                  <div style={{ marginTop: 'auto' }}>
                    <Button url="/app/order" fullWidth>View Orders</Button>
                  </div>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineGrid columns="auto 1fr" gap="400" alignItems="center">
                    <div style={{ background: '#f1f2f4', padding: '12px', borderRadius: '8px' }}>
                      <Icon source={HeartIcon} tone="base" />
                    </div>
                    <Text variant="headingSm" as="h3">Store Health</Text>
                  </InlineGrid>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Monitor churn, inactivity, and key retention metrics.
                  </Text>
                  <div style={{ marginTop: 'auto' }}>
                    <Button url="/app/store-health" fullWidth>View Health</Button>
                  </div>
                </BlockStack>
              </Card>

            </InlineGrid>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
