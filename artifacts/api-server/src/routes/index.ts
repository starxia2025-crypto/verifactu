import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import taxpayersRouter from "./taxpayers";
import clientsRouter from "./clients";
import productsRouter from "./products";
import seriesRouter from "./series";
import invoicesRouter from "./invoices";
import verifactuRouter from "./verifactu";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";
import integrationSourcesRouter from "./integration-sources";
import apiKeysRouter from "./api-keys";
import externalApiRouter from "./external-api";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(organizationsRouter);
router.use(taxpayersRouter);
router.use(clientsRouter);
router.use(productsRouter);
router.use(seriesRouter);
router.use(invoicesRouter);
router.use(verifactuRouter);
router.use(documentsRouter);
router.use(dashboardRouter);
router.use(integrationSourcesRouter);
router.use(apiKeysRouter);
router.use(externalApiRouter);

export default router;
