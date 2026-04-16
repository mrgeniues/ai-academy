import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import coursesRouter from "./courses";
import lessonsRouter from "./lessons";
import enrollmentsRouter from "./enrollments";
import postsRouter from "./posts";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";
import uploadRouter from "./upload";
import messagesRouter from "./messages";
import maintenanceRouter from "./maintenance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(coursesRouter);
router.use(lessonsRouter);
router.use(enrollmentsRouter);
router.use(postsRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);
router.use(uploadRouter);
router.use(messagesRouter);
router.use(maintenanceRouter);

export default router;
