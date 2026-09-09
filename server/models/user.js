const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // hashed with bcrypt
    role: {
      type: String,
      enum: ["customer", "rider", "admin"],
      default: "customer",
    },
    phone: { type: String },
    // only relevant for riders — their last known position
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
