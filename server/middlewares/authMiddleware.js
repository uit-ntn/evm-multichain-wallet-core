// server/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const { config } = require("../adapters/config.adapter");

exports.verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Bearer token" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // Thêm user info vào req
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError")
      return res.status(401).json({ message: "Token expired" });
    return res.status(401).json({ message: "Invalid token" });
  }
};
