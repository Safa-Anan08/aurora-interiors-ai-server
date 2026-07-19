import { Router } from "express";
import Product from "../models/Product";

const router = Router();

router.post("/products", async (req, res) => {
    try {
        await Product.deleteMany();

        await Product.insertMany(req.body);

        res.json({
            success: true,
            message: "Products Seeded Successfully"
        });
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

export default router;