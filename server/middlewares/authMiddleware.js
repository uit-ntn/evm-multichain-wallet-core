// server/middlewares/authMiddleware.js
require("dotenv").config();
const jwt = require("jsonwebtoken");

/**
 * Middleware xác thực JWT
 * - Đọc token từ header Authorization: Bearer <token>
 * - Giải mã token bằng JWT_SECRET trong .env
 * - Gán payload vào req.user nếu hợp lệ
 */
exports.verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // 1️⃣ Kiểm tra có header Authorization không
    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized: Missing Authorization header" });
    }

    // 2️⃣ Tách phần Bearer
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Missing token value" });
    }

    // 3️⃣ Log secret để kiểm tra (có thể xoá sau khi test)
    console.log("🧩 Using JWT_SECRET:", process.env.JWT_SECRET);

    console.log("🔎 Authorization header:", req.headers.authorization);

    // 4️⃣ Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5️⃣ Gắn payload vào request
    req.user = decoded;

    // 6️⃣ Cho phép đi tiếp
    next();
  } catch (error) {
    console.error("JWT verify error:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
// === BỔ SUNG: alias để route có thể dùng authJwt như verifyJWT ===
exports.authJwt = exports.verifyJWT;

// === BỔ SUNG: middleware JWT tùy chọn (không 401 nếu thiếu/sai token) ===
exports.optionalJwt = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || "";

    // Nếu có header Bearer thì thử verify, sai cũng bỏ qua
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // gán nếu verify được
      } catch (_) {
        // bỏ qua lỗi token cho optional
      }
    }

    return next();
  } catch (_) {
    // Không chặn request trong optional
    return next();
  }
};

