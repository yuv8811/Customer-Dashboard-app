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
    Avatar,
    TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(
        `#graphql
    query CustomersData {
      customers(first: 250) {
        edges {
          node {
            id
            firstName
            lastName
            email
            defaultAddress {
              country
            }
            tags
            numberOfOrders
            lastOrder {
              processedAt
            }
            createdAt
          }
        }
      }
    }`,
    );

    const responseJson = await response.json();

    return {
        customers: responseJson.data.customers.edges.map(edge => edge.node),
    };
};

export default function Customer() {
    const { customers } = useLoaderData();

    const { mode, setMode } = useSetIndexFiltersMode();
    const [queryValue, setQueryValue] = useState("");
    const [tagFilter, setTagFilter] = useState("");
    const [countryFilter, setCountryFilter] = useState("");
    const [itemsOrderCount, setItemsOrderCount] = useState("");
    const [lastOrderDateFilter, setLastOrderDateFilter] = useState("");
    const [sortSelected, setSortSelected] = useState(['date desc']);

    const handleQueryValueChange = useCallback((value) => setQueryValue(value), []);
    const handleTagChange = useCallback((value) => setTagFilter(value), []);
    const handleCountryChange = useCallback((value) => setCountryFilter(value), []);
    const handleOrderCountChange = useCallback((value) => setItemsOrderCount(value), []);
    const handleLastOrderDateChange = useCallback((value) => setLastOrderDateFilter(value), []);

    const handleClearAll = useCallback(() => {
        setQueryValue("");
        setTagFilter("");
        setCountryFilter("");
        setItemsOrderCount("");
        setLastOrderDateFilter("");
    }, []);

    const filteredCustomers = useMemo(() => {
        let filtered = customers.filter((customer) => {
            const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
            const email = (customer.email || "").toLowerCase();
            const query = queryValue.toLowerCase();
            if (query && !fullName.includes(query) && !email.includes(query)) {
                return false;
            }

            if (tagFilter) {
                const tags = customer.tags || [];
                if (!tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))) {
                    return false;
                }
            }

            if (countryFilter) {
                const country = customer.defaultAddress?.country || "";
                if (!country.toLowerCase().includes(countryFilter.toLowerCase())) {
                    return false;
                }
            }

            if (itemsOrderCount) {
                const count = parseInt(itemsOrderCount, 10);
                if (!isNaN(count) && customer.numberOfOrders < count) {
                    return false;
                }
            }

            if (lastOrderDateFilter) {
                if (!customer.lastOrder?.processedAt) return true;
                const filterDate = new Date(lastOrderDateFilter);
                const orderDate = new Date(customer.lastOrder.processedAt);
                if (orderDate > filterDate) {
                    return false;
                }
            }

            return true;
        });

        if (sortSelected.length > 0) {
            const [sortKey, sortDirection] = sortSelected[0].split(' ');

            filtered.sort((a, b) => {
                let aValue, bValue;

                if (sortKey === 'name') {
                    aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
                    bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
                } else if (sortKey === 'date') {
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                }

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [customers, queryValue, tagFilter, countryFilter, itemsOrderCount, lastOrderDateFilter, sortSelected]);

    const exportToCSV = () => {
        const headers = ["ID", "Name", "Email", "Country", "Tags", "Orders", "Last Order Date", "Joined Date"];
        const rows = filteredCustomers.map((node) => [
            node.id,
            `${node.firstName} ${node.lastName}`,
            node.email || '',
            node.defaultAddress?.country || '',
            (node.tags || []).join(", "),
            node.numberOfOrders,
            node.lastOrder?.processedAt ? new Date(node.lastOrder.processedAt).toDateString() : 'Never',
            new Date(node.createdAt).toDateString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(item => `"${item}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "filtered_customers.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filters = [
        {
            key: "tag",
            label: "Tags",
            filter: (
                <TextField
                    label="Tags"
                    value={tagFilter}
                    onChange={handleTagChange}
                    autoComplete="off"
                    labelHidden />
            ),
            shortcut: true,
        },
        {
            key: "country",
            label: "Country",
            filter: (
                <TextField
                    label="Country"
                    value={countryFilter}
                    onChange={handleCountryChange}
                    autoComplete="off"
                    labelHidden />
            ),
        },
        {
            key: "orderCount",
            label: "Min Order Count",
            filter: (
                <TextField
                    label="Min Order Count"
                    type="number"
                    value={itemsOrderCount}
                    onChange={handleOrderCountChange}
                    autoComplete="off"
                    labelHidden
                />
            ),
        },
        {
            key: "lastOrder",
            label: "Last Order Before",
            filter: (
                <TextField
                    label="Last Order Before"
                    type="date"
                    value={lastOrderDateFilter}
                    onChange={handleLastOrderDateChange}
                    autoComplete="off"
                    labelHidden
                />
            ),
        },
    ];

    const appliedFilters = [];
    if (tagFilter) {
        appliedFilters.push({
            key: "tag",
            label: `Tag: ${tagFilter}`,
            onRemove: () => setTagFilter(""),
        });
    }
    if (countryFilter) {
        appliedFilters.push({
            key: "country",
            label: `Country: ${countryFilter}`,
            onRemove: () => setCountryFilter(""),
        });
    }
    if (itemsOrderCount) {
        appliedFilters.push({
            key: "orderCount",
            label: `Orders >= ${itemsOrderCount}`,
            onRemove: () => setItemsOrderCount(""),
        });
    }
    if (lastOrderDateFilter) {
        appliedFilters.push({
            key: "lastOrder",
            label: `Last Order before ${lastOrderDateFilter}`,
            onRemove: () => setLastOrderDateFilter(""),
        });
    }

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(filteredCustomers);

    const resourceName = {
        singular: 'customer',
        plural: 'customers',
    };

    const rowMarkup = filteredCustomers.map(
        (node, index) => (
            <IndexTable.Row
                id={node.id}
                key={node.id}
                selected={selectedResources.includes(node.id)}
                position={index}
            >
                <IndexTable.Cell>
                    <InlineGrid columns="auto 1fr" gap="200" alignItems="center">
                        <Avatar customer size="md" name={`${node.firstName} ${node.lastName}`} />
                        <Link removeUnderline url={`shopify:admin/customers/${node.id.split('/').pop()}`}>
                            <Text variant="bodyMd" fontWeight="bold" as="span">
                                {node.firstName} {node.lastName}
                            </Text>
                        </Link>
                    </InlineGrid>
                </IndexTable.Cell>
                <IndexTable.Cell>{node.email || 'No email'}</IndexTable.Cell>
                <IndexTable.Cell>{node.defaultAddress?.country || '-'}</IndexTable.Cell>
                <IndexTable.Cell>
                    {node.tags && node.tags.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {node.tags.map(tag => <Badge tone="info" key={tag}>{tag}</Badge>)}
                        </div>
                    ) : '-'}
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Text as="span" alignment="end" numeric>
                        {node.numberOfOrders}
                    </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Text as="span" tone={node.lastOrder ? undefined : 'subdued'}>
                        {node.lastOrder?.processedAt ? new Date(node.lastOrder.processedAt).toLocaleDateString() : 'Never'}
                    </Text>
                </IndexTable.Cell>
            </IndexTable.Row>
        ),
    );

    const emptyStateMarkup = (
        <EmptyState
            heading="No customers found"
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
        actions: index === 0 ? [] : [
            {
                type: 'rename',
                onAction: () => { },
                onPrimaryAction: async (value) => {
                    const newItems = [...itemStrings];
                    newItems[index] = value;
                    setItemStrings(newItems);
                    return true;
                },
            },
            {
                type: 'delete',
                onPrimaryAction: async () => {
                    const newItems = [...itemStrings];
                    newItems.splice(index, 1);
                    setItemStrings(newItems);
                    return true;
                },
            },
        ],
    }));
    const [selected, setSelected] = useState(0);

    return (
        <Page
            title="Customer Dashboard"
            subtitle="View and manage customer segments"
            primaryAction={{
                content: "Export Filtered CSV",
                onAction: exportToCSV,
                variant: 'primary'
            }}
            fullWidth
        >
            <BlockStack gap="500">
                <Layout>
                    <Layout.Section>
                        <InlineGrid columns={['oneThird', 'oneThird', 'oneThird']} gap="400">
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">Total Customers</Text>
                                    <Text variant="heading2xl" as="p">{customers.length}</Text>
                                </BlockStack>
                            </Card>
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">Filtered Count</Text>
                                    <Text variant="heading2xl" as="p">{filteredCustomers.length}</Text>
                                </BlockStack>
                            </Card>
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">Average Orders</Text>
                                    <Text variant="heading2xl" as="p">
                                        {customers.length > 0
                                            ? (customers.reduce((acc, c) => acc + c.numberOfOrders, 0) / customers.length).toFixed(1)
                                            : 0}
                                    </Text>
                                </BlockStack>
                            </Card>
                        </InlineGrid>
                    </Layout.Section>
                    <Layout.Section>
                        <Card padding="0">
                            <IndexFilters
                                sortOptions={[
                                    { label: 'Name', value: 'name asc', directionLabel: 'A-Z' },
                                    { label: 'Name', value: 'name desc', directionLabel: 'Z-A' },
                                    { label: 'Date', value: 'date asc', directionLabel: 'Oldest first' },
                                    { label: 'Date', value: 'date desc', directionLabel: 'Newest first' },
                                ]}
                                sortSelected={sortSelected}
                                onSort={setSortSelected}
                                queryValue={queryValue}
                                queryPlaceholder="Searching in all"
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
                                itemCount={filteredCustomers.length}
                                selectedItemsCount={
                                    allResourcesSelected ? 'All' : selectedResources.length
                                }
                                onSelectionChange={handleSelectionChange}
                                headings={[
                                    { title: 'Name' },
                                    { title: 'Email' },
                                    { title: 'Country' },
                                    { title: 'Tags' },
                                    { title: 'Orders', alignment: 'end' },
                                    { title: 'Last Order' },
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
