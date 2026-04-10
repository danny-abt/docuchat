import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "Tu es un assistant qui analyse des documents. Réponds uniquement basé sur le contenu du document fourni. Si la réponse n'est pas dans le document, dis-le clairement. Sois précis et concis.";

const MODEL = "claude-sonnet-4-20250514";
const MAX_DOC_CHARS = 180_000; // garde-fou contre un PDF géant

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API manquante côté serveur." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      documentText?: string;
      messages?: ChatMessage[];
    };

    const documentText = (body.documentText ?? "").trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!documentText) {
      return NextResponse.json(
        { error: "Aucun document fourni. Uploadez un PDF d'abord." },
        { status: 400 }
      );
    }
    if (messages.length === 0) {
      return NextResponse.json({ error: "Aucun message." }, { status: 400 });
    }

    const trimmedDoc =
      documentText.length > MAX_DOC_CHARS
        ? documentText.slice(0, MAX_DOC_CHARS) + "\n\n[... document tronqué ...]"
        : documentText;

    const client = new Anthropic({ apiKey });

    // On injecte le document dans le premier tour utilisateur pour qu'il soit
    // cacheable et reste présent dans tout le contexte de la conversation.
    const conversationForApi = messages.map((m, i) => {
      if (i === 0 && m.role === "user") {
        return {
          role: "user" as const,
          content: `Voici le document sur lequel tu dois baser toutes tes réponses :\n\n<document>\n${trimmedDoc}\n</document>\n\nQuestion : ${m.content}`,
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: conversationForApi,
    });

    const answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!answer) {
      return NextResponse.json(
        { error: "Claude n'a pas retourné de réponse. Réessayez." },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[/api/chat] error:", err);

    const raw = err instanceof Error ? err.message : "";

    let userMessage = "Erreur inattendue. Réessayez.";
    if (raw.includes("overloaded") || raw.includes("529"))
      userMessage = "Les serveurs Claude sont surchargés. Réessayez dans quelques secondes.";
    else if (raw.includes("credit") || raw.includes("balance"))
      userMessage = "Crédits Anthropic insuffisants. Rechargez votre compte.";
    else if (raw.includes("401") || raw.includes("invalid_api_key"))
      userMessage = "Clé API invalide. Vérifiez votre configuration.";
    else if (raw.includes("rate_limit") || raw.includes("429"))
      userMessage = "Limite de requêtes atteinte. Patientez un moment.";

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
