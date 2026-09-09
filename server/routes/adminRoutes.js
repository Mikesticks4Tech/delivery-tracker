const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// --- DASHBOARD STATS (admin only) ---
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const totalRiders = await User.countDocuments({ role: "rider" });
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Total revenue from paid orders only
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$deliveryFee" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Orders grouped by day for the last 7 days (for a trend chart)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalOrders,
      deliveredOrders,
      pendingOrders,
      totalRiders,
      totalCustomers,
      totalRevenue,
      dailyOrders,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch stats", error: err.message });
  }
});

module.exports = router;
