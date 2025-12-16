import { Page, Layout, Card, Text, Button, Box, BlockStack, List, Badge, Divider } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request)
    const response = await admin.graphql(
        `#graphql
        mutation{
            billingAgreementCreate(
                input: {
                    name: "Customer Dashboard"
                    plan: "basic"
                }
            ) {
                billingAgreement {
                    id
                }
            }
        }
        `
    );
};
export default function Pricing() {
    return (
        <Page
            title="Pricing Plans"
            subtitle="Choose the perfect plan for your business needs."
        >
            <Layout>
                <Layout.Section variant="oneThird">
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <Text variant="headingRg" as="h3">Basic</Text>
                                    <Text variant="heading3xl" as="h2">Free</Text>
                                    <Text variant="bodyMd" as="p" tone="subdued">
                                        Essential tools for new businesses.
                                    </Text>
                                </BlockStack>

                                <Divider />

                                <BlockStack gap="300">
                                    <Text variant="headingSm" as="h4">Features</Text>
                                    <List type="bullet">
                                        <List.Item>Basic Customer Profile</List.Item>
                                        <List.Item>Last 30 days history</List.Item>
                                        <List.Item>Standard Support</List.Item>
                                    </List>
                                </BlockStack>

                                <Button fullWidth>Current Plan</Button>
                            </BlockStack>
                        </Box>
                    </Card>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '10px', zIndex: 1 }}>
                            <Badge tone="success">Most Popular</Badge>
                        </div>
                        <Card>
                            <Box padding="400">
                                <BlockStack gap="400">
                                    <BlockStack gap="200">
                                        <Text variant="headingRg" as="h3">Grow</Text>
                                        <Text variant="heading3xl" as="h2">$19/mo</Text>
                                        <Text variant="bodyMd" as="p" tone="subdued">
                                            Advanced insights for growing stores.
                                        </Text>
                                    </BlockStack>

                                    <Divider />

                                    <BlockStack gap="300">
                                        <Text variant="headingSm" as="h4">Everything in Basic, plus:</Text>
                                        <List type="bullet">
                                            <List.Item>Full Customer Timeline</List.Item>
                                            <List.Item>Segment Analytics</List.Item>
                                            <List.Item>Email Integration</List.Item>
                                            <List.Item>Priority Support</List.Item>
                                        </List>
                                    </BlockStack>

                                    <Button fullWidth variant="primary">Upgrade to Grow</Button>
                                </BlockStack>
                            </Box>
                        </Card>
                    </div>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <Text variant="headingRg" as="h3">Advance</Text>
                                    <Text variant="heading3xl" as="h2">$49/mo</Text>
                                    <Text variant="bodyMd" as="p" tone="subdued">
                                        Maximum power for scaling brands.
                                    </Text>
                                </BlockStack>

                                <Divider />

                                <BlockStack gap="300">
                                    <Text variant="headingSm" as="h4">Everything in Grow, plus:</Text>
                                    <List type="bullet">
                                        <List.Item>Custom Reports</List.Item>
                                        <List.Item>API Access</List.Item>
                                        <List.Item>Dedicated Account Manager</List.Item>
                                        <List.Item>Unlimited History</List.Item>
                                    </List>
                                </BlockStack>

                                <Button fullWidth>Upgrade to Advance</Button>
                            </BlockStack>
                        </Box>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}