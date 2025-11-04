import express from "express";
import { orderController } from "../controllers/orderController.js";

const router = express.Router();

router.post("/", orderController.create);
router.post("/validate-signature", orderController.validateSignature);
router.get("/", orderController.list);
router.get("/:id", orderController.getById);
router.patch("/:id", orderController.update);
router.patch("/:id/cancel", orderController.cancel);
router.patch("/:id/expire", orderController.expire);
router.delete("/:id", orderController.delete);

export default router;
