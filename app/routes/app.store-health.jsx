import { useLoaderData } from "react-router";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineGrid,
    IndexTable,
    Badge,
    Icon,
    Tooltip,
} from "@shopify/polaris";
import { ArrowUpIcon, ArrowDownIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request)
    const response = await admin.graphql(
        `#graphql
    query StoreHealthData {
        customers(first: 250) {
            edges {
            node {
                id
                firstName
                lastName
                defaultEmailAddress{
                emailAddress
                }
                amountSpent {
                amount
                }
                numberOfOrders
                lastOrder {
                processedAt
                displayFinancialStatus
                }
                orders(first: 10) {
                edges {
                    node {
                    displayFinancialStatus
                    }
                }
                }
            }
            }
        }
        orders(first: 250, reverse: true) {
            edges {
            node {
                id
                processedAt
                displayFinancialStatus
                cancelledAt
            }
            }
        }
        }`,
    );

    const data = await response.json();
    const customers = data.data.customers.edges.map(e => e.node);
    const orders = data.data.orders.edges.map(e => e.node);

    const now = new Date();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    const ordersLast7d = orders.filter(o => new Date(o.processedAt) >= sevenDaysAgo).length;
    const ordersPrev7d = orders.filter(o => {
        const d = new Date(o.processedAt);
        return d >= fourteenDaysAgo && d < sevenDaysAgo;
    }).length;

    const orderTrend = ordersLast7d - ordersPrev7d;
    const orderTrendPercent = ordersPrev7d > 0 ? ((orderTrend / ordersPrev7d) * 100).toFixed(1) : 100;
    const cancelled30d = orders.filter(o => {
        const d = new Date(o.processedAt);
        return d >= thirtyDaysAgo && (o.displayFinancialStatus === 'REFUNDED' || o.displayFinancialStatus === 'VOIDED' || o.cancelledAt);
    }).length;

    const inactiveCustomers90 = customers.filter(c => {
        if (!c.lastOrder) return true;
        return new Date(c.lastOrder.processedAt) < ninetyDaysAgo;
    });

    const customersNoEmail = customers.filter(c => !c.email || c.email === "").length;

    const refundHeavyCustomers = customers.filter(c => {
        const refunds = c.orders.edges.filter(o => o.node.displayFinancialStatus === 'REFUNDED' || o.node.displayFinancialStatus === 'PARTIALLY_REFUNDED').length;
        return refunds > 1;
    });

    const totalSpentSum = customers.reduce((acc, c) => acc + parseFloat(c.totalSpent?.amount || 0), 0);
    const avgSpent = totalSpentSum / (customers.length || 1);

    const atRiskHighValue = customers.filter(c => {
        if (!c.lastOrder) return false;
        const spent = parseFloat(c.totalSpent?.amount || 0);
        const lastOrderDate = new Date(c.lastOrder.processedAt);
        return spent > avgSpent && lastOrderDate < sixtyDaysAgo;
    });

    return {
        metrics: {
            ordersLast7d,
            ordersPrev7d,
            orderTrend,
            orderTrendPercent,
            cancelled30d,
            inactiveCount90: inactiveCustomers90.length,
            customersNoEmail
        },
        lists: {
            refundHeavy: refundHeavyCustomers.map(c => ({
                id: c.id,
                name: `${c.firstName} ${c.lastName}`,
                email: c.email,
                refunds: c.orders.edges.filter(o => o.node.displayFinancialStatus.includes('REFUNDED')).length
            })),
            atRiskHighValue: atRiskHighValue.map(c => ({
                id: c.id,
                name: `${c.firstName} ${c.lastName}`,
                spent: c.totalSpent?.amount,
                lastOrder: c.lastOrder.processedAt
            }))
        }
    };
};

export default function StoreHealth() {
    const { metrics, lists } = useLoaderData();

    return (
        <Page title="Store Health" fullWidth subtitle="Key metrics and at-risk customer segments">
            <BlockStack gap="600">
                <Layout>
                    <Layout.Section>
                        <InlineGrid columns={['oneThird', 'oneThird', 'oneThird']} gap="400">
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">Orders (Last 7 Days)</Text>
                                    <InlineGrid columns="auto auto" gap="200" alignItems="center">
                                        <Text variant="heading3xl" as="p">{metrics.ordersLast7d}</Text>
                                        {metrics.orderTrend !== 0 && (
                                            <Badge tone={metrics.orderTrend >= 0 ? 'success' : 'critical'}>
                                                <InlineGrid gap="100" alignItems="center">
                                                    {metrics.orderTrend >= 0 ? <Icon source={ArrowUpIcon} tone="success" /> : <Icon source={ArrowDownIcon} tone="critical" />}
                                                    {Math.abs(metrics.orderTrendPercent)}%
                                                </InlineGrid>
                                            </Badge>
                                        )}
                                    </InlineGrid>
                                    <Text variant="bodySm" tone="subdued">vs. {metrics.ordersPrev7d} previous 7 days</Text>
                                </BlockStack>
                            </Card>

                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">Inactive Customers (90d+)</Text>
                                    <Text variant="heading3xl" as="p">{metrics.inactiveCount90}</Text>
                                    <Text variant="bodySm" tone="subdued">Customers with no recent orders</Text>
                                </BlockStack>
                            </Card>

                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">Cancelled Orders (30d)</Text>
                                    <Text variant="heading3xl" as="p" tone={metrics.cancelled30d > 0 ? 'critical' : undefined}>
                                        {metrics.cancelled30d}
                                    </Text>
                                    <Text variant="bodySm" tone="subdued">Voids or Refunds in last 30 days</Text>
                                </BlockStack>
                            </Card>
                        </InlineGrid>
                    </Layout.Section>

                    <Layout.Section>
                        <InlineGrid columns={['oneHalf', 'oneHalf']} gap="400">
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">Missing Customer Emails</Text>
                                    <Text variant="heading2xl" as="p">{metrics.customersNoEmail}</Text>
                                    <Text variant="bodySm" tone="subdued">Accounts requiring contact updates</Text>
                                </BlockStack>
                            </Card>
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">At-Risk Revenue</Text>
                                    <Text variant="heading2xl" as="p">
                                        {lists.atRiskHighValue.length} customers
                                    </Text>
                                    <Text variant="bodySm" tone="subdued">High value segment drifting away</Text>
                                </BlockStack>
                            </Card>
                        </InlineGrid>
                    </Layout.Section>

                    <Layout.Section>
                        <InlineGrid columns={['oneHalf', 'oneHalf']} gap="400">
                            <Card padding="0">
                                <BlockStack>
                                    <div style={{ padding: '16px' }}>
                                        <Text variant="headingMd" as="h2">Refund-Heavy Customers</Text>
                                        <Text variant="bodySm" tone="subdued">Customers with multiple refunds recently</Text>
                                    </div>
                                    <IndexTable
                                        resourceName={{ singular: 'customer', plural: 'customers' }}
                                        itemCount={lists.refundHeavy.length}
                                        headings={[
                                            { title: 'Customer' },
                                            { title: 'Refund Count' },
                                        ]}
                                        selectable={false}
                                    >
                                        {lists.refundHeavy.length > 0 ? lists.refundHeavy.map((row, index) => (
                                            <IndexTable.Row id={row.id} key={row.id} position={index}>
                                                <IndexTable.Cell>
                                                    <Text fontWeight="bold">{row.name}</Text>
                                                    <Text variant="bodyXs" tone="subdued">{row.email}</Text>
                                                </IndexTable.Cell>
                                                <IndexTable.Cell>
                                                    <Badge tone="critical">{row.refunds} Refunds</Badge>
                                                </IndexTable.Cell>
                                            </IndexTable.Row>
                                        )) : (
                                            <IndexTable.Row id="empty" position={0}>
                                                <IndexTable.Cell colSpan={2}>
                                                    <div style={{ textAlign: 'center', padding: '10px' }}>
                                                        <Text tone="subdued">No refund-heavy customers found</Text>
                                                    </div>
                                                </IndexTable.Cell>
                                            </IndexTable.Row>
                                        )}
                                    </IndexTable>
                                </BlockStack>
                            </Card>

                            <Card padding="0">
                                <BlockStack>
                                    <div style={{ padding: '16px' }}>
                                        <Text variant="headingMd" as="h2">High-Value At Risk</Text>
                                        <Text variant="bodySm" tone="subdued">Big spenders inactive for 60+ days</Text>
                                    </div>
                                    <IndexTable
                                        resourceName={{ singular: 'customer', plural: 'customers' }}
                                        itemCount={lists.atRiskHighValue.length}
                                        headings={[
                                            { title: 'Customer' },
                                            { title: 'Total Spent' },
                                            { title: 'Last Active' },
                                        ]}
                                        selectable={false}
                                    >
                                        {lists.atRiskHighValue.length > 0 ? lists.atRiskHighValue.map((row, index) => (
                                            <IndexTable.Row id={row.id} key={row.id} position={index}>
                                                <IndexTable.Cell>
                                                    <Text fontWeight="bold">{row.name}</Text>
                                                </IndexTable.Cell>
                                                <IndexTable.Cell>
                                                    <Text numeric>{row.spent}</Text>
                                                </IndexTable.Cell>
                                                <IndexTable.Cell>
                                                    <Tooltip content={new Date(row.lastOrder).toDateString()}>
                                                        <Text tone="critical">{new Date(row.lastOrder).toLocaleDateString()}</Text>
                                                    </Tooltip>
                                                </IndexTable.Cell>
                                            </IndexTable.Row>
                                        )) : (
                                            <IndexTable.Row id="empty-risk" position={0}>
                                                <IndexTable.Cell colSpan={3}>
                                                    <div style={{ textAlign: 'center', padding: '10px' }}>
                                                        <Text tone="subdued">No at-risk high value customers</Text>
                                                    </div>
                                                </IndexTable.Cell>
                                            </IndexTable.Row>
                                        )}
                                    </IndexTable>
                                </BlockStack>
                            </Card>
                        </InlineGrid>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}