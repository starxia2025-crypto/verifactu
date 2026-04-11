import { Router, type IRouter } from "express";
import { and, db, eq, ilike, productsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  ListProductsParams,
  ListProductsQueryParams,
  CreateProductParams,
  CreateProductBody,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/taxpayers/:taxpayerId/products", requireAuth, async (req, res): Promise<void> => {
  const params = ListProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const query = ListProductsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;

  let q = db.select().from(productsTable).$dynamic();
  if (search) {
    q = q.where(and(eq(productsTable.taxpayerId, params.data.taxpayerId), ilike(productsTable.name, `%${search}%`)));
  } else {
    q = q.where(eq(productsTable.taxpayerId, params.data.taxpayerId));
  }

  const products = await q;
  res.json(products);
});

router.post("/taxpayers/:taxpayerId/products", requireAuth, async (req, res): Promise<void> => {
  const params = CreateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const values = {
    ...parsed.data,
    taxpayerId: params.data.taxpayerId,
    unitPrice: String(parsed.data.unitPrice),
    vatRate: String(parsed.data.vatRate),
  };
  const [product] = await db
    .insert(productsTable)
    .values(values)
    .returning();
  res.status(201).json(product);
});

router.patch("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData = {
    ...parsed.data,
    unitPrice: parsed.data.unitPrice === undefined ? undefined : String(parsed.data.unitPrice),
    vatRate: parsed.data.vatRate === undefined ? undefined : String(parsed.data.vatRate),
  };
  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

router.delete("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
