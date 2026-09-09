const express = require("express");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// --- CREATE ORDER (customer only) ---
router.post("/", protect, authorize("customer"), async (req, res) => {
  try {
    const {
      pickupAddress,
      pickupCoords,
      dropoffAddress,
      dropoffCoords,
      deliveryFee,
    } = req.body;

    const order = await Order.create({
      customer: req.user.id,
      pickupAddress,
      pickupCoords,
      dropoffAddress,
      dropoffCoords,
      deliveryFee,
    });

    res.status(201).json(order);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create order", error: err.message });
  }
});

// --- GET PENDING ORDERS (rider only — the "pool" to accept from) ---
router.get("/pending", protect, authorize("rider"), async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" }).populate(
      "customer",
      "name phone",
    );
    res.json(orders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch pending orders", error: err.message });
  }
});

// --- ACCEPT ORDER (rider only) ---
router.patch("/:id/accept", protect, authorize("rider"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order already accepted" });
    }

    order.rider = req.user.id;
    order.status = "accepted";
    await order.save();

    res.json(order);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to accept order", error: err.message });
  }
});

// --- UPDATE STATUS (rider only — e.g. mark in_transit or delivered) ---
router.patch("/:id/status", protect, authorize("rider"), async (req, res) => {
  try {
    const { status } = req.body; // 'in_transit' or 'delivered'
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.rider) !== req.user.id) {
      return res.status(403).json({ message: "Not your order" });
    }

    order.status = status;
    await order.save();

    res.json(order);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update status", error: err.message });
  }
});

// --- GET MY ORDERS (customer sees their own, rider sees assigned) ---
router.get("/mine", protect, async (req, res) => {
  try {
    const filter =
      req.user.role === "rider"
        ? { rider: req.user.id }
        : { customer: req.user.id };

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: err.message });
  }
});

module.exports = router;
