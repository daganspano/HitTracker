import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

function saveHitsPlugin() {
  return {
    name: "save-hits-api",
    configureServer(server: any) {
      server.middlewares.use("/api/save-hits", (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", () => {
          try {
            const { week, day, hits } = JSON.parse(body);
            const filePath = path.resolve(__dirname, "src/data/hits.json");
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            let weekEntry = data.find((w: any) => w.week === week);
            if (!weekEntry) {
              weekEntry = { week, days: {}, total: 0, hits: [] };
              data.push(weekEntry);
            }
            weekEntry.days[day] = hits;

            // Recalculate total from all days
            let total = 0;
            for (const dayHits of Object.values(weekEntry.days)) {
              for (const hit of dayHits as any[]) {
                total += hit.time || 0;
              }
            }
            weekEntry.total = total;

            // Rebuild the week-level hits array from all day entries, combining same tasks
            const taskMap: Record<string, number> = {};
            for (const dayHits of Object.values(weekEntry.days)) {
              for (const hit of dayHits as any[]) {
                if (taskMap[hit.task] !== undefined) {
                  taskMap[hit.task] += hit.time || 0;
                } else {
                  taskMap[hit.task] = hit.time || 0;
                }
              }
            }
            let key = 1;
            const allHits: any[] = [];
            for (const [task, time] of Object.entries(taskMap)) {
              allHits.push({ key: key++, task, time });
            }
            weekEntry.hits = allHits;

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      saveHitsPlugin(),
      sendEmailPlugin(env),
      saveResumePlugin(),
    ],
    server: {
      proxy: {
        "/ollama": {
          target: "http://localhost:11434",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama/, ""),
        },
      },
    },
  };
});

function saveResumePlugin() {
  return {
    name: "save-resume-api",
    configureServer(server: any) {
      server.middlewares.use("/api/save-resume", (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", () => {
          try {
            const { workExperience, softwareSkills } = JSON.parse(body);

            const wePath = path.resolve(
              __dirname,
              "src/data/workExperience.json",
            );
            const ssPath = path.resolve(
              __dirname,
              "src/data/softwareSkills.json",
            );

            fs.writeFileSync(
              wePath,
              JSON.stringify(workExperience, null, 2),
              "utf8",
            );
            fs.writeFileSync(
              ssPath,
              JSON.stringify(softwareSkills, null, 2),
              "utf8",
            );

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

function sendEmailPlugin(env: Record<string, string>) {
  return {
    name: "send-email-api",
    configureServer(server: any) {
      server.middlewares.use("/api/send-email", (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", async () => {
          try {
            const { subject, text } = JSON.parse(body);
            const transporter = nodemailer.createTransport({
              host: "smtp.gmail.com",
              port: 587,
              secure: false,
              auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              },
            });
            await transporter.sendMail({
              from: env.SMTP_USER,
              to: "Troy.Brooks@wilsonco.com", // "daganspano@ksu.edu"
              cc: ["ray.jackson@wilsonco.com", "dcspano@wilsonco.com"],
              subject,
              text,
            });
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}
