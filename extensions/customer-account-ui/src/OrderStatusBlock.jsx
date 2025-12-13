// @ts-nocheck
import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default (root, api) => {
  const target = root || document.body;
  render(<ProfilePage api={api} />, target);
}

function ProfilePage({ api }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("shopify:storefront/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GetProfile {
                customer {
                  firstName
                  lastName
                  email
                  phone
                  defaultAddress {
                    firstName
                    lastName
                    address1
                    city
                    province
                    zip
                    country
                  }
                  orders(first: 5, sortKey: PROCESSED_AT, reverse: true) {
                    edges {
                      node {
                        name
                        processedAt
                        financialStatus
                        totalPrice {
                          amount
                          currencyCode
                        }
                        lineItems(first: 3) {
                           edges {
                              node {
                                 title
                              }
                           }
                        }
                      }
                    }
                  }
                }
              }
            `
          }),
        });

        const json = await response.json();

        if (json.errors) {
          console.error("GraphQL Errors:", json.errors);
          setErrorMsg(JSON.stringify(json.errors));
        } else if (json.data?.customer) {
          setProfile(json.data.customer);
        } else {
          console.error("No profile found:", json);
          setErrorMsg("No customer data returned. Ensure you are logged in.");
        }
      } catch (error) {
        console.error("Profile Fetch Error:", error);
        setErrorMsg(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <s-block-stack spacing="base">
        <s-banner status="info" title="Loading Profile...">
          <s-text>Fetching your account details...</s-text>
        </s-banner>
      </s-block-stack>
    );
  }

  if (errorMsg) {
    return (
      <s-block-stack spacing="base">
        <s-banner status="critical" title="Error Loading Profile">
          <s-text>{errorMsg}</s-text>
        </s-banner>
      </s-block-stack>
    );
  }

  if (!profile) {
    return (
      <s-banner status="warning" title="Profile Unavailable">
        <s-text>We could not retrieve your account details at this time.</s-text>
      </s-banner>
    );
  }

  // Destructure with fallbacks
  const { firstName, lastName, email, defaultAddress, orders } = profile;

  return (
    <s-block-stack spacing="loose">

      {/* Profile Header Card */}
      <s-card padding="loose">
        <s-grid columns={['auto', 'fill']} spacing="loose" block-align="center">
          {/* Avatar / Placeholder */}
          <s-view
            border="base"
            border-radius="full"
            padding="base"
            style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' }}
          >
            <s-text size="heading" weight="bold">{firstName?.[0] || '?'}{lastName?.[0] || '?'}</s-text>
          </s-view>

          <s-block-stack spacing="tight">
            <s-heading level="1">{firstName} {lastName}</s-heading>
            <s-text appearance="subdued">{email}</s-text>
            <s-badge tonality="success">Active Member</s-badge>
          </s-block-stack>
        </s-grid>
      </s-card>

      <s-grid columns={['1fr', '2fr']} spacing="loose">

        {/* Left Col: Contact & Address */}
        <s-block-stack spacing="loose">
          <s-card padding="base">
            <s-block-stack spacing="base">
              <s-heading level="2">Default Address</s-heading>
              {defaultAddress ? (
                <s-block-stack spacing="none">
                  <s-text weight="bold">{defaultAddress.firstName} {defaultAddress.lastName}</s-text>
                  <s-text>{defaultAddress.address1}</s-text>
                  <s-text>{defaultAddress.city}, {defaultAddress.province} {defaultAddress.zip}</s-text>
                  <s-text>{defaultAddress.country}</s-text>
                </s-block-stack>
              ) : (
                <s-text appearance="subdued">No default address set.</s-text>
              )}
              <s-button kind="secondary" onPress={() => console.log('Edit Address')}>Manage Addresses</s-button>
            </s-block-stack>
          </s-card>
        </s-block-stack>

        {/* Right Col: Recent Orders */}
        <s-block-stack spacing="loose">
          <s-heading level="2">Recent Orders</s-heading>
          {orders?.edges?.length > 0 ? (
            orders.edges.map(({ node: order }) => (
              <s-card key={order.name} padding="base">
                <s-grid columns={['fill', 'auto']} spacing="base">
                  <s-block-stack spacing="tight">
                    <s-heading level="3">Order {order.name}</s-heading>
                    <s-text appearance="subdued">{new Date(order.processedAt).toLocaleDateString()}</s-text>
                    <s-text size="small" appearance="subdued">
                      {order.lineItems.edges.map(e => e.node.title).join(', ')}
                    </s-text>
                  </s-block-stack>

                  <s-block-stack spacing="tight" inline-alignment="end">
                    <s-text weight="bold">
                      {order.totalPrice.amount} {order.totalPrice.currencyCode}
                    </s-text>
                    <s-badge tonality={order.financialStatus === 'PAID' ? 'success' : 'attention'}>
                      {order.financialStatus}
                    </s-badge>
                  </s-block-stack>
                </s-grid>
              </s-card>
            ))
          ) : (
            <s-card padding="base">
              <s-text appearance="subdued">No recent orders found.</s-text>
            </s-card>
          )}
        </s-block-stack>

      </s-grid>

    </s-block-stack>
  );
}