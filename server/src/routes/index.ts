import { router } from "../trpc/index.js";
import { patientsRouter } from "./patients.js";
import { consultationsRouter } from "./consultations.js";
import { aiRouter } from "./ai.js";
import { audioRouter } from "./audio.js";
import { lgpdRouter } from "./lgpd.js";

export const appRouter = router({
  patients: patientsRouter,
  consultations: consultationsRouter,
  ai: aiRouter,
  audio: audioRouter,
  lgpd: lgpdRouter,
});

export type AppRouter = typeof appRouter;
