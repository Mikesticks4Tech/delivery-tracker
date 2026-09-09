import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import api from "../api/axios";
import socket from "../socket";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CustomerOrder = () => {
  const [form, setForm] = useState({
    pickupAddress: "",
    dropoffAddress: "",
    deliveryFee: "",
  });
  const [order, setOrder] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const socketConnected = useRef(false);

  useEffect(() => {
    if (!socketConnected.current) {
      const token = localStorage.getItem("token");
      socket.auth = { token };
      socket.connect();
      socketConnected.current = true;
    }
    return () => {
      socket.disconnect();
      socketConnected.current = false;
    };
  }, []);

  useEffect(() => {
    if (!order) return;
    socket.emit("order:join", order._id);

    const handleBroadcast = (data) => setRiderLocation(data);
    socket.on("location:broadcast", handleBroadcast);

    return () => socket.off("location:broadcast", handleBroadcast);
  }, [order]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/orders", {
        pickupAddress: form.pickupAddress,
        pickupCoords: { lat: 6.6018, lng: 3.3515 },
        dropoffAddress: form.dropoffAddress,
        dropoffCoords: { lat: 6.4281, lng: 3.4219 },
        deliveryFee: Number(form.deliveryFee),
      });
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-blue-100 text-blue-700",
    in_transit: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Create Delivery Order
        </h2>

        {!order && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-md p-6 space-y-4"
          >
            <input
              name="pickupAddress"
              placeholder="Pickup address"
              value={form.pickupAddress}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="dropoffAddress"
              placeholder="Dropoff address"
              value={form.dropoffAddress}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="deliveryFee"
              type="number"
              placeholder="Delivery fee (NGN)"
              value={form.deliveryFee}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg py-2.5 text-sm transition"
            >
              {loading ? "Creating..." : "Create Order"}
            </button>
          </form>
        )}

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        {order && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Order
              </h3>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status]}`}
              >
                {order.status.replace("_", " ")}
              </span>
            </div>

            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>
                <span className="font-medium text-gray-800">Pickup:</span>{" "}
                {order.pickupAddress}
              </p>
              <p>
                <span className="font-medium text-gray-800">Dropoff:</span>{" "}
                {order.dropoffAddress}
              </p>
              <p>
                <span className="font-medium text-gray-800">Fee:</span> ₦
                {order.deliveryFee}
              </p>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-3">
              {riderLocation
                ? "🟢 Rider is on the way"
                : "⏳ Waiting for a rider to accept..."}
            </p>

            {riderLocation && (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <MapContainer
                  center={[riderLocation.lat, riderLocation.lng]}
                  zoom={15}
                  style={{ height: "350px", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <Marker position={[riderLocation.lat, riderLocation.lng]}>
                    <Popup>Rider's current location</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrder;
