import { useState, useCallback } from "react";
import { useLoaderData } from "react-router";
import {
    Page,
    Layout,
    Card,
    Button,
    Text,
    BlockStack,
    InlineStack,
    Badge,
    Thumbnail,
    Box,
    Modal,
    Scrollable,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(
        `#graphql
    query GetProducts {
      products(first: 12) {
        edges {
          node {
            id
            title
            status
            vendor
            createdAt
            descriptionHtml
            totalInventory
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  sku
                  price
                }
              }
            }
          }
        }
      }
    }
  `
    );

    const parsedResponse = await response.json();
    return parsedResponse.data.products.edges;
};

export default function Product() {
    const products = useLoaderData();
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [active, setActive] = useState(false);

    const handleOpenModal = useCallback((product) => {
        setSelectedProduct(product);
        setActive(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setActive(false);
        setSelectedProduct(null);
    }, []);

    return (
        <Page title="Products" subtitle="Manage your product catalog">
            <Layout>
                {products.map(({ node: product }) => {
                    const image = product.images.edges[0]?.node;
                    const variant = product.variants.edges[0]?.node;
                    const price = variant?.price || "0.00";
                    const sku = variant?.sku || "N/A";

                    return (
                        <Layout.Section key={product.id} variant="oneThird">
                            <Card>
                                <BlockStack gap="400">
                                    <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                        <InlineStack align="center" blockAlign="center">
                                            <Thumbnail
                                                source={image?.url || ImageIcon}
                                                alt={image?.altText || product.title}
                                                size="large"
                                            />
                                        </InlineStack>
                                    </Box>

                                    <BlockStack gap="200">
                                        <InlineStack align="space-between">
                                            <Text variant="headingMd" as="h6">
                                                {product.title}
                                            </Text>
                                        </InlineStack>
                                        <InlineStack align="space-between">
                                            <Badge tone={product.status === 'ACTIVE' ? 'success' : 'info'}>
                                                {product.status}
                                            </Badge>

                                            <Text variant="bodySm" tone="subdued">
                                                {product.vendor}
                                            </Text>
                                        </InlineStack>

                                        <InlineStack align="space-between">
                                            <Text variant="bodyMd" fontWeight="bold">
                                                SKU: {sku}
                                            </Text>
                                            <Text variant="headinglg" as="h4">
                                                ${price}
                                            </Text>
                                        </InlineStack>
                                    </BlockStack>

                                    <Button fullWidth variant="primary" onClick={() => handleOpenModal(product)}>
                                        View Details
                                    </Button>
                                </BlockStack>
                            </Card>
                        </Layout.Section>
                    );
                })}
            </Layout>

            <Modal
                open={active}
                onClose={handleCloseModal}
                title={selectedProduct?.title}
                primaryAction={{
                    content: 'Close',
                    onAction: handleCloseModal,
                }}
                secondaryActions={[
                    {
                        content: 'View in Admin',
                        url: selectedProduct ? `shopify:admin/products/${selectedProduct.id.split('/').pop()}` : '',
                        external: true
                    }
                ]}
            >
                <Modal.Section>
                    {selectedProduct && (
                        <BlockStack gap="400">
                            <InlineStack align="start" gap="400">
                                <Thumbnail
                                    source={selectedProduct.images.edges[0]?.node?.url || ImageIcon}
                                    alt={selectedProduct.images.edges[0]?.node?.altText || selectedProduct.title}
                                    size="large"
                                />
                                <BlockStack gap="200">
                                    <Text variant="headinglg" as="h2">${selectedProduct.variants.edges[0]?.node?.price}</Text>
                                    <Box>
                                        <Badge tone={selectedProduct.status === 'ACTIVE' ? 'success' : 'info'}>
                                            {selectedProduct.status}
                                        </Badge>
                                    </Box>
                                    <Text variant="bodyMd" tone="subdued">Vendor: {selectedProduct.vendor}</Text>
                                    <Text variant="bodyMd" tone="subdued">Inventory: {selectedProduct.totalInventory} in stock</Text>
                                    <Text variant="bodyMd" tone="subdued">Created: {new Date(selectedProduct.createdAt).toLocaleDateString()}</Text>
                                </BlockStack>
                            </InlineStack>

                            <Box paddingBlockStart="200">
                                <Text variant="headingSm" as="h5">Description</Text>
                                <Box paddingBlockStart="200">
                                    <Scrollable shadow style={{ maxHeight: '200px' }}>
                                        <div dangerouslySetInnerHTML={{ __html: selectedProduct.descriptionHtml || '<p>No description available.</p>' }} />
                                    </Scrollable>
                                </Box>
                            </Box>
                        </BlockStack>
                    )}
                </Modal.Section>
            </Modal>
        </Page>
    );
}
