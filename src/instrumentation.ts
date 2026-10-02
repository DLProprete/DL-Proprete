import type { Instrumentation } from "next";

// Toute erreur serveur (page, action, route) est journalisée et peut
// déclencher une alerte : voir src/server/errors/report.ts.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("./server/errors/report");
  const report = reportServerError({
    message: error instanceof Error ? error.message : String(error),
    digest: typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined,
    method: request.method,
    path: request.path,
    routeType: context.routeType,
  });
  // Next attend ce hook avant de répondre (routes API) : base ou SMTP en panne
  // ne doivent pas faire traîner la réponse d'erreur. Le rapport continue en fond.
  await Promise.race([report, new Promise((resolve) => setTimeout(resolve, 3_000))]);
};
