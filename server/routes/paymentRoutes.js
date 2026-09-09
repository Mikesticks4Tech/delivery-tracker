const express = require("express");
const axios = require("axios");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");

const router = express.Router();

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const paystackHeaders = {
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

// --- INITIALIZE PAYMENT (customer pays for an order's delivery fee) ---
router.post("/initialize/:orderId", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "customer",
      "email",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.customer._id) !== req.user.id) {
      return res.status(403).json({ message: "Not your order" });
    }

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: order.customer.email,
        amount: order.deliveryFee * 100, // Paystack expects kobo, not naira
        metadata: { orderId: order._id.toString() },
      },
      { headers: paystackHeaders },
    );

    res.json(response.data.data); // contains authorization_url + reference
  } catch (err) {
    res.status(500).json({
      message: "Payment initialization failed",
      error: err.response?.data || err.message,
    });
  }
});

// --- VERIFY PAYMENT (called after customer completes checkout) ---
router.get("/verify/:reference", protect, async (req, res) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${req.params.reference}`,
      { headers: paystackHeaders },
    );

    const { status, metadata } = response.data.data;

    if (status === "success") {
      const order = await Order.findById(metadata.orderId);
      if (order) {
        order.paymentStatus = "paid";
        order.paystackReference = req.params.reference;
        await order.save();
      }
      return res.json({ message: "Payment verified", order });
    }

    res.status(400).json({ message: "Payment not successful", status });
  } catch (err) {
    res.status(500).json({
      message: "Payment verification failed",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
