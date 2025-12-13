import { useState, useCallback, useMemo } from "react";
import { useLoaderData } from "react-router";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  useIndexResourceState,
  BlockStack,
  InlineGrid,
  EmptyState,
  Link,
  IndexFilters,
  useSetIndexFiltersMode,
  TextField,
  Select,
  ChoiceList,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query OrdersData {
      orders(first: 50, reverse: true) {
        edges {
          node {
            id
            name
            displayFulfillmentStatus
            displayFinancialStatus
            processedAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              firstName
              lastName
            }
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
            cancelReason
          }
        }
      }
    }`,
  );

  const responseJson = await response.json();

  return {
    orders: responseJson.data.orders.edges.map(edge => edge.node),
  };
};

export default function Order() {
  const { orders } = useLoaderData();

  // Filter State
  const { mode, setMode } = useSetIndexFiltersMode();
  const [queryValue, setQueryValue] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [sortSelected, setSortSelected] = useState(['date desc']);

  // Filter Handlers
  const handleQueryValueChange = useCallback((value) => setQueryValue(value), []);
  const handleStatusChange = useCallback((value) => setStatusFilter(value), []);
  const handleDateChange = useCallback((value) => setDateFilter(value), []);
  const handleProductChange = useCallback((value) => setProductFilter(value), []);

  const handleClearAll = useCallback(() => {
    setQueryValue("");
    setStatusFilter([]);
    setDateFilter("");
    setProductFilter("");
  }, []);

  // Derived Data (Filtering & Sorting)
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      // Text Search (Order Name / Customer)
      const orderName = (order.name || "").toLowerCase();
      const customerName = order.customer ? `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase() : "";
      const query = queryValue.toLowerCase();
      if (query && !orderName.includes(query) && !customerName.includes(query)) {
        return false;
      }

      // Status Filter (Financial Status)
      if (statusFilter.length > 0) {
        if (!statusFilter.includes(order.displayFinancialStatus?.toLowerCase())) {
          return false;
        }
      }

      // Date Filter (Orders AFTER this date)
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        const orderDate = new Date(order.processedAt);
        // "Filter by date" usually means "show me orders from this date" or "after this date".
        // Let's assume broad matching or "on or after". 
        if (orderDate < filterDate) {
          return false;
        }
      }

      // Product Filter (Simple substring match on any line item title)
      if (productFilter) {
        const productMatch = order.lineItems.edges.some(({ node }) =>
          node.title.toLowerCase().includes(productFilter.toLowerCase())
        );
        if (!productMatch) return false;
      }

      return true;
    });

    // Sorting Logic
    if (sortSelected.length > 0) {
      const [sortKey, sortDirection] = sortSelected[0].split(' ');

      filtered.sort((a, b) => {
        let aValue, bValue;

        if (sortKey === 'order') {
          aValue = a.name;
          bValue = b.name;
        } else if (sortKey === 'date') {
          aValue = new Date(a.processedAt).getTime();
          bValue = new Date(b.processedAt).getTime();
        } else if (sortKey === 'total') {
          aValue = parseFloat(a.totalPriceSet?.shopMoney?.amount || 0);
          bValue = parseFloat(b.totalPriceSet?.shopMoney?.amount || 0);
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [orders, queryValue, statusFilter, dateFilter, productFilter, sortSelected]);

  // High Refund / Cancel Patterns
  const stats = useMemo(() => {
    const total = orders.length;
    const cancelled = orders.filter(o => o.displayFinancialStatus === 'VOIDED' || o.displayFinancialStatus === 'REFUNDED' || o.cancelReason).length;
    const pending = orders.filter(o => o.displayFinancialStatus === 'PENDING').length;

    // "High-refund/cancel pattern" - simplistic heuristic
    const highRisk = cancelled / total > 0.1; // > 10% cancellations

    return {
      total,
      cancelled,
      pending,
      highRisk
    };
  }, [orders]);


  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: 'Paid', value: 'paid' },
            { label: 'Pending', value: 'pending' },
            { label: 'Refunded', value: 'refunded' },
            { label: 'Voided', value: 'voided' },
          ]}
          selected={statusFilter}
          onChange={handleStatusChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: "product",
      label: "Product",
      filter: (
        <TextField
          label="Product"
          value={productFilter}
          onChange={handleProductChange}
          autoComplete="off"
          labelHidden
          placeholder="Search by product name"
        />
      ),
    },
    {
      key: "date",
      label: "Date (On or After)",
      filter: (
        <TextField
          label="Date"
          type="date"
          value={dateFilter}
          onChange={handleDateChange}
          autoComplete="off"
          labelHidden
        />
      ),
    },
  ];

  const appliedFilters = [];
  if (statusFilter.length > 0) {
    appliedFilters.push({
      key: "status",
      label: `Status: ${statusFilter.join(", ")}`,
      onRemove: () => setStatusFilter([]),
    });
  }
  if (productFilter) {
    appliedFilters.push({
      key: "product",
      label: `Product: ${productFilter}`,
      onRemove: () => setProductFilter(""),
    });
  }
  if (dateFilter) {
    appliedFilters.push({
      key: "date",
      label: `After: ${dateFilter}`,
      onRemove: () => setDateFilter(""),
    });
  }

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredOrders);

  const resourceName = {
    singular: 'order',
    plural: 'orders',
  };

  const rowMarkup = filteredOrders.map(
    (node, index) => (
      <IndexTable.Row
        id={node.id}
        key={node.id}
        selected={selectedResources.includes(node.id)}
        position={index}
      >
        <IndexTable.Cell>
          <Link removeUnderline url={`shopify:admin/orders/${node.id.split('/').pop()}`}>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              {node.name}
            </Text>
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {new Date(node.processedAt).toDateString()}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {node.customer ? `${node.customer.firstName} ${node.customer.lastName}` : 'No Customer'}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text numeric>
            {node.totalPriceSet?.shopMoney?.amount} {node.totalPriceSet?.shopMoney?.currencyCode}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={node.displayFinancialStatus === 'PAID' ? 'success' : node.displayFinancialStatus === 'REFUNDED' ? 'critical' : 'attention'}>
            {node.displayFinancialStatus}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={node.displayFulfillmentStatus === 'FULFILLED' ? 'success' : 'attention'}>
            {node.displayFulfillmentStatus}
          </Badge>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const emptyStateMarkup = (
    <EmptyState
      heading="No orders found"
      action={{ content: 'Clear all filters', onAction: handleClearAll }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Try changing the filters or search term to find what you're looking for.</p>
    </EmptyState>
  );

  const [itemStrings, setItemStrings] = useState(['All']);
  const tabs = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => { },
    id: `${item}-${index}`,
    isLocked: index === 0,
    actions: []
  }));
  const [selected, setSelected] = useState(0);

  return (
    <Page
      title="Orders Dashboard"
      subtitle="View and analyze order patterns"
      fullWidth
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <InlineGrid columns={['oneThird', 'oneThird', 'oneThird']} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Total Orders</Text>
                  <Text variant="heading2xl" as="p">{stats.total}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Cancelled/Refunded</Text>
                  <Text variant="heading2xl" as="p" tone={stats.highRisk ? 'critical' : undefined}>
                    {stats.cancelled}
                  </Text>
                  {stats.highRisk && <Text variant="bodyXs" tone="critical">High cancellation rate detected</Text>}
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Pending</Text>
                  <Text variant="heading2xl" as="p">{stats.pending}</Text>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>

          <Layout.Section>
            <Card padding="0">
              <IndexFilters
                sortOptions={[
                  { label: 'Order', value: 'order asc', directionLabel: 'Ascending' },
                  { label: 'Order', value: 'order desc', directionLabel: 'Descending' },
                  { label: 'Date', value: 'date asc', directionLabel: 'Oldest first' },
                  { label: 'Date', value: 'date desc', directionLabel: 'Newest first' },
                  { label: 'Total', value: 'total asc', directionLabel: 'Low to High' },
                  { label: 'Total', value: 'total desc', directionLabel: 'High to Low' },
                ]}
                sortSelected={sortSelected}
                onSort={setSortSelected}
                queryValue={queryValue}
                queryPlaceholder="Search orders"
                onQueryChange={handleQueryValueChange}
                onQueryClear={() => setQueryValue("")}
                primaryAction={{
                  type: 'save-as',
                  onAction: () => { },
                  disabled: false,
                  loading: false,
                }}
                cancelAction={{
                  onAction: () => { },
                  disabled: false,
                  loading: false,
                }}
                tabs={tabs}
                selected={selected}
                onSelect={setSelected}
                canCreateNewView
                onCreateNewView={() => { }}
                filters={filters}
                appliedFilters={appliedFilters}
                onClearAll={handleClearAll}
                mode={mode}
                setMode={setMode}
              />
              <IndexTable
                resourceName={resourceName}
                itemCount={filteredOrders.length}
                selectedItemsCount={
                  allResourcesSelected ? 'All' : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: 'Order' },
                  { title: 'Date' },
                  { title: 'Customer' },
                  { title: 'Total' },
                  { title: 'Payment Status' },
                  { title: 'Fulfillment Status' },
                ]}
                emptyState={emptyStateMarkup}
              >
                {rowMarkup}
              </IndexTable>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
