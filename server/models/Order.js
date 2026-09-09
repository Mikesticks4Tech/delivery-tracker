const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    pickupAddress: { type: String, required: true },
    pickupCoords: { lat: Number, lng: Number },

    dropoffAddress: { type: String, required: true },
    dropoffCoords: { lat: Number, lng: Number },

    status: {
      type: String,
      enum: ["pending", "accepted", "in_transit", "delivered", "cancelled"],
      default: "pending",
    },

    deliveryFee: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    paystackReference: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
