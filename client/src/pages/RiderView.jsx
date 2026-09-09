import { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import socket from "../socket";

const RiderView = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    fetchPending();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    socket.auth = { token };
    socket.connect();
    return () => socket.disconnect();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get("/orders/pending");
      setPendingOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    }
  };

  const handleAccept = async (orderId) => {
    setLoading(true);
    try {
      const res = await api.patch(`/orders/${orderId}/accept`);
      setActiveOrder(res.data);
      startSharingLocation(res.data._id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept order");
    } finally {
      setLoading(false);
    }
  };

  const startSharingLocation = (orderId) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device");
      return;
    }

    socket.emit("order:join", orderId);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socket.emit("location:update", {
          orderId,
          lat: latitude,
          lng: longitude,
        });
      },
      (err) => setError("Location error: " + err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  };

  const stopSharingLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleMarkDelivered = async () => {
    try {
      await api.patch(`/orders/${activeOrder._id}/status`, {
        status: "delivered",
      });
      stopSharingLocation();
      setActiveOrder(null);
      fetchPending();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Rider Dashboard
        </h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {!activeOrder ? (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Pending Orders
              </h3>
              <button
                onClick={fetchPending}
                className="text-sm text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {pendingOrders.length === 0 && (
              <p className="text-sm text-gray-500">
                No pending orders right now.
              </p>
            )}

            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order._id}
                  className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="text-sm text-gray-700 space-y-0.5">
                    <p>
                      <span className="font-medium text-gray-900">Pickup:</span>{" "}
                      {order.pickupAddress}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">
                        Dropoff:
                      </span>{" "}
                      {order.dropoffAddress}
                    </p>
                    <p className="text-gray-500">₦{order.deliveryFee}</p>
                  </div>
                  <button
                    onClick={() => handleAccept(order._id)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg px-4 py-2 transition shrink-0 ml-4"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Active Delivery
              </h3>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                In transit
              </span>
            </div>

            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>
                <span className="font-medium text-gray-800">Pickup:</span>{" "}
                {activeOrder.pickupAddress}
              </p>
              <p>
                <span className="font-medium text-gray-800">Dropoff:</span>{" "}
                {activeOrder.dropoffAddress}
              </p>
            </div>

            <p className="text-sm font-medium text-green-600 mb-4">
              🟢 Sharing your live location...
            </p>

            <button
              onClick={handleMarkDelivered}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg py-2.5 text-sm transition"
            >
              Mark as Delivered
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderView;
