import { defineConfig } from "@trigger.dev/sdk/v3";
import { tasks } from "@trigger.dev/sdk/v3";
import * as Sentry from "@sentry/node";

// Twaalf achtergrondjobs draaiden zonder enige foutmelding naar Sentry:
// portaalherinneringen, trial-mails, factuurherinneringen, mailsync. Trigger.dev
// logt een mislukte run wel in zijn eigen dashboard, maar dat is een tweede
// plek om te kijken, en in de praktijk kijkt niemand daar tot een klant belt
// dat hij geen herinnering heeft gehad. Een job die stil stopt is erger dan een
// job die luid faalt: het lijkt of alles goed gaat.
//
// Een globale haak in plaats van twaalf losse: een job die er later bijkomt is
// dan meteen gedekt in plaats van vergeten.
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

tasks.onFailure(({ task, error, ctx }) => {
  try {
    Sentry.captureException(error, {
      tags: { bron: "trigger-job", job: task },
      extra: { runId: ctx?.run?.id },
    });
  } catch {
    // Een kapotte foutmelding mag een al mislukte job niet erger maken.
  }
});

export default defineConfig({
  project: "proj_sltbalkuvnlkwkiyvxts",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
