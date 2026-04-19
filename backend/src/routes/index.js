import { Router } from "express";

import { authRouter } from "./auth.routes.js";
import { submissionRouter } from "./submission.routes.js";
import { sessionRouter } from "./session.routes.js";
import { summaryRouter } from "./summary.routes.js";
import { adminRouter } from "./admin.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/submissions", submissionRouter);
apiRouter.use("/sessions", sessionRouter);
apiRouter.use("/summaries", summaryRouter);
apiRouter.use("/admin", adminRouter);
