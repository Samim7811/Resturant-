export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "restaurant-payment-api",
    message: "Payment API is running"
  });
}
