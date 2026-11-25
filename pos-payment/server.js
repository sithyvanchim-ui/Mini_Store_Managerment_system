import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import db from "./db.js";
import {
  createReference,
  createPayment,
  verifyWebhookSignature
} from "./payment.js";

const ABA_ACCOUNT_ID = "019449489";
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const productCount = db.prepare("SELECT COUNT(*) AS count FROM products").get().count;

if (productCount === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, price_cents, stock)
    VALUES (?, ?, ?)
  `);

  insert.run("Coffee", 250, 100);
  insert.run("Tea", 200, 100);
  insert.run("Rice Plate", 650, 50);
  insert.run("Chicken Sandwich", 450, 50);
}

app.get("/api/products", (req, res) => {
  const products = db.prepare(`
    SELECT id, name, price_cents, stock
    FROM products
    ORDER BY id
  `).all();

  res.json({ products });
});

app.post("/api/orders", async (req, res) => {
  try {
    const { items, provider = "aba" } = req.body;

    if (provider !== "aba" && provider !== "acleda") {
      return res
        .status(400)
        .json({ error: 'provider must be "aba" or "acleda"' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items are required" });
    }

    const getProduct = db.prepare("SELECT * FROM products WHERE id = ?");
    const insertOrder = db.prepare(`
      INSERT INTO orders (reference, merchant_id, total_cents, currency, status)
      VALUES (?, ?, ?, ?, 'PENDING')
    `);
    const insertItem = db.prepare(`
      INSERT INTO order_items
      (order_id, product_id, name, unit_price_cents, quantity, line_total_cents)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let total = 0;
    const preparedItems = [];

    for (const item of items) {
      const product = getProduct.get(item.productId);

      if (!product) {
        return res.status(400).json({ error: `Invalid product: ${item.productId}` });
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ error: "Invalid quantity" });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ error: `Insufficient stock: ${product.name}` });
      }

      const lineTotal = product.price_cents * quantity;
      total += lineTotal;

      preparedItems.push({ product, quantity, lineTotal });
    }

    const reference = createReference();

    const order = {
      reference,
      merchant_id: ABA_ACCOUNT_ID,
      total_cents: total,
      currency: "USD"
    };

    const payment = await createPayment({ order, provider });

    const createOrder = db.transaction(() => {
      const result = insertOrder.run(
        reference,
        order.merchant_id,
        total,
        order.currency
      );

      const orderId = result.lastInsertRowid;

      for (const item of preparedItems) {
        insertItem.run(
          orderId,
          item.product.id,
          item.product.name,
          item.product.price_cents,
          item.quantity,
          item.lineTotal
        );
      }

      db.prepare(`
        UPDATE orders
        SET payment_method = ?, provider_reference = ?
        WHERE reference = ?
      `).run(payment.provider, payment.providerReference, reference);

      db.prepare(`
        INSERT INTO aba_transactions (account_id, order_reference, amount_cents, status)
        VALUES (?, ?, ?, 'PENDING')
      `).run(ABA_ACCOUNT_ID, reference, total);
    });

    createOrder();

    res.status(201).json({
      orderReference: reference,
      totalCents: total,
      currency: order.currency,
      payment: {
        provider: payment.provider,
        providerReference: payment.providerReference,
        qrContent: payment.qrContent,
        appLink: payment.appLink,
        checkoutUrl: payment.checkoutUrl
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create order" });
  }
});

app.get("/api/orders/:reference", (req, res) => {
  const order = db.prepare(`
    SELECT * FROM orders WHERE reference = ?
  `).get(req.params.reference);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const items = db.prepare(`
    SELECT name, unit_price_cents, quantity, line_total_cents
    FROM order_items
    WHERE order_id = ?
  `).all(order.id);

  res.json({ order, items });
});

app.post(
  "/webhooks/payments/:provider",
  express.raw({ type: "*/*" }),
  (req, res) => {
    const provider = req.params.provider;
    const rawBody = req.body.toString("utf8");
    const signature =
      req.get("x-payment-signature") || req.get("x-signature") || "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    let event;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const {
      eventId,
      orderReference,
      status
    } = event;

    if (!eventId || !orderReference || !status) {
      return res.status(400).json({ error: "Missing webhook fields" });
    }

    const order = db.prepare(`
      SELECT * FROM orders WHERE reference = ?
    `).get(orderReference);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const insertEvent = db.prepare(`
      INSERT OR IGNORE INTO webhook_events
      (provider_event_id, order_reference, payload)
      VALUES (?, ?, ?)
    `);

    const result = insertEvent.run(eventId, orderReference, rawBody);

    if (result.changes === 0) {
      return res.json({ received: true, duplicate: true });
    }

    if (status === "PAID") {
      db.prepare(`
        UPDATE orders
        SET status = 'PAID',
            paid_at = datetime('now')
        WHERE reference = ? AND status = 'PENDING'
      `).run(orderReference);
      db.prepare(`
        UPDATE aba_transactions
        SET status = 'PAID'
        WHERE order_reference = ? AND status = 'PENDING'
      `).run(orderReference);
    } else if (status === "FAILED") {
      db.prepare(`
        UPDATE orders
        SET status = 'FAILED'
        WHERE reference = ? AND status = 'PENDING'
      `).run(orderReference);
      db.prepare(`
        UPDATE aba_transactions
        SET status = 'FAILED'
        WHERE order_reference = ? AND status = 'PENDING'
      `).run(orderReference);
    }

    res.json({ received: true });
  }
);

app.get("/pay/:reference", (req, res) => {
  const order = db.prepare(`
    SELECT * FROM orders WHERE reference = ?
  `).get(req.params.reference);

  if (!order) return res.status(404).send("Order not found");

  res.send(`
    <h1>ABA Payment</h1>
    <p>Order: ${order.reference}</p>
    <p>Amount: $${(order.total_cents / 100).toFixed(2)}</p>
    <form method="post" action="/mock-pay/${order.reference}">
      <button>Simulate successful payment</button>
    </form>
  `);
});

app.post("/mock-pay/:reference", (req, res) => {
  const order = db.prepare(`
    SELECT * FROM orders WHERE reference = ?
  `).get(req.params.reference);

  if (!order) return res.status(404).send("Order not found");

  const payload = {
    eventId: `EVT-${crypto.randomBytes(8).toString("hex")}`,
    orderReference: order.reference,
    providerReference: order.provider_reference,
    status: "PAID",
    amountCents: order.total_cents,
    currency: order.currency
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  fetch(`${process.env.BASE_URL}/webhooks/payments/aba`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-payment-signature": signature
    },
    body: rawBody
  });

  res.send("Payment simulated. Return to POS to see status.");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`POS server running on port ${process.env.PORT || 3000}`);
});
