import { Router, type IRouter } from "express";
import { and, clientsTable, db, eq, ilike, or } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  ListClientsParams,
  ListClientsQueryParams,
  CreateClientParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/taxpayers/:taxpayerId/clients", requireAuth, async (req, res): Promise<void> => {
  const params = ListClientsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const query = ListClientsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;

  let q = db.select().from(clientsTable).$dynamic();
  if (search) {
    q = q.where(and(
      eq(clientsTable.taxpayerId, params.data.taxpayerId),
      or(
        ilike(clientsTable.name, `%${search}%`),
        ilike(clientsTable.nif ?? clientsTable.name, `%${search}%`)
      )
    ));
  } else {
    q = q.where(eq(clientsTable.taxpayerId, params.data.taxpayerId));
  }

  const clients = await q;
  res.json(clients);
});

router.post("/taxpayers/:taxpayerId/clients", requireAuth, async (req, res): Promise<void> => {
  const params = CreateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db
    .insert(clientsTable)
    .values({ ...parsed.data, taxpayerId: params.data.taxpayerId })
    .returning();
  res.status(201).json(client);
});

router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id)).limit(1);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
});

router.patch("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.update(clientsTable).set(parsed.data).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
});

router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [client] = await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
