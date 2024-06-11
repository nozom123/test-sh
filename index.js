const express = require("express");
const { shopifyApp } = require("@shopify/shopify-app-express");
const { default: axios } = require("axios");

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES.split(","),
    hostScheme: "https",
    hostName: "robust-killdeer-pleasantly.ngrok-free.app",
  },
  auth: {
    path: "/shopify/auth",
    callbackPath: "/shopify/auth/redirect",
  },
  webhooks: {
    path: "/shopify/webhooks",
  },
});

const app = express();
app.use(express.json());

app.get(shopify.config.auth.path, shopify.auth.begin());

app.get(shopify.config.auth.callbackPath, async (req, res, next) => {
  const { shop, hmac, code } = req.query;
  if (!shop || !hmac || !code) {
    return res.status(400).send("Unauthorized!");
  }

  try {
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }
    );
    const accessToken = response.data.access_token;
    console.log("******************************************");
    console.log("access token:", accessToken);
    console.log(response.data);
    console.log("******************************************");

    const webhooksResponse = await axios.get(
      "https://testing-store-dh.myshopify.com/admin/api/2024-04/webhooks.json",
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    const webhooks = webhooksResponse.data.webhooks;
    console.log("******************************************");
    console.log("webhooks:", webhooks);
    console.log("******************************************");
    const orderCreateWebhookExists = webhooks.some((webhook) => {
      return webhook.topic === "orders/create";
    });
    const orderUpdateWebhookExists = webhooks.some((webhook) => {
      return webhook.topic === "orders/update";
    });

    console.log("******************************************");
    console.log("orderCreateWebhookExists:", orderCreateWebhookExists);
    console.log("orderUpdateWebhookExists:", orderUpdateWebhookExists);
    console.log("******************************************");

    if (!orderCreateWebhookExists) {
      await axios.post(
        `https://testing-store-dh.myshopify.com/admin/api/2024-04/webhooks.json`,
        {
          webhook: {
            topic: "orders/create",
            address:
              "https://robust-killdeer-pleasantly.ngrok-free.app/shopify/webhook/orders/create",
            format: "json",
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );
    }

    if (!orderUpdateWebhookExists) {
      await axios.post(
        `https://testing-store-dh.myshopify.com/admin/api/2024-04/webhooks.json`,
        {
          webhook: {
            topic: "orders/updated",
            address:
              "https://robust-killdeer-pleasantly.ngrok-free.app/shopify/webhook/orders/updated",
            format: "json",
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );
    }
    res.status(200).redirect("/shopify?shop=" + shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// app.post(
//   shopify.config.webhooks.path,
//   shopify.processWebhooks({
//     webhookHandlers: {},
//   })
// );

app.get("/shopify/test", async (req, res) => {
  // const webhook = await axios.post(
  //   `https://testing-store-dh.myshopify.com/admin/api/2024-04/webhooks.json`,
  //   {
  //     webhook: {
  //       topic: "orders/updated",
  //       address:
  //         "https://robust-killdeer-pleasantly.ngrok-free.app/shopify/webhook/orders/update",
  //       format: "json",
  //     },
  //   },
  //   {
  //     headers: {
  //       "X-Shopify-Access-Token": "shpua_f5f09890dc126bc38ae760178254f29b",
  //     },
  //   }
  // );
  const webhook = await axios.get(
    "https://testing-store-dh.myshopify.com/admin/api/2024-04/webhooks.json",
    {
      headers: {
        "X-Shopify-Access-Token": "shpua_f5f09890dc126bc38ae760178254f29b",
      },
    }
  );
  res.status(200).send(webhook.data);
});

app.post("/shopify/webhook/orders/create", async (req, res) => {
  console.log(
    "****************************************** order created ******************************************"
  );
  console.log(req.body);
  res.sendStatus(200);
});
app.post("/shopify/webhook/orders/updated", async (req, res) => {
  console.log(
    "****************************************** order updated ******************************************"
  );
  console.log(req.body);
  res.sendStatus(200);
});

app.get("/shopify", async (req, res) => {
  // check if the app is installed
  const shop = req.query.shop;
  if (!shop) {
    return res.status(400).send("Unauthorized!");
  }

  res.status(200).send("Thnder is installed successfully!");
});
app.post("/shopify/webhook/gpdr", async (req, res) => {
  console.log(
    "************************************************** OK **************************************************"
  );
  console.log(req.body);
  res.sendStatus(200);
});

app.get("/", async (req, res) => {
  res.send("HELLO WORLD!");
});
app.listen(process.env.PORT || 3001, () => console.log("Server started"));
