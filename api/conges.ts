import { Redis } from "@upstash/redis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const REDIS_KEY = "conges:yearPlans";

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // En-têtes CORS pour autoriser l'accès depuis l'app mobile, le web ou le dev local
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const redis = getRedisClient();
  if (!redis) {
    return res.status(500).json({
      error:
        "Configuration manquante : UPSTASH_REDIS_REST_URL ou UPSTASH_REDIS_REST_TOKEN n'est pas défini dans l'environnement Vercel.",
    });
  }

  try {
    if (req.method === "GET") {
      const data = await redis.get(REDIS_KEY);
      return res.status(200).json(data ?? []);
    }

    if (req.method === "POST") {
      let plans = req.body;
      if (typeof plans === "string") {
        try {
          plans = JSON.parse(plans);
        } catch {
          return res.status(400).json({ error: "Corps de requête JSON invalide." });
        }
      }

      if (!Array.isArray(plans)) {
        return res.status(400).json({ error: "Un tableau de plans est attendu." });
      }

      await redis.set(REDIS_KEY, plans);
      return res.status(200).json({ success: true, count: plans.length });
    }

    return res.status(405).json({ error: "Méthode non autorisée." });
  } catch (error: any) {
    console.error("Erreur serveur Upstash / Vercel:", error);
    return res.status(500).json({
      error: "Erreur interne lors de la communication avec la base de données.",
      details: error?.message,
    });
  }
}
