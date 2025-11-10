import jwt from "jsonwebtoken";

export const playerProtect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) return res.status(401).json({ success: false, message: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "player") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    req.playerId = decoded.playerId;
    req.adminId = decoded.adminId;
    next();
  } catch (err) {
    next(err);
  }
};
