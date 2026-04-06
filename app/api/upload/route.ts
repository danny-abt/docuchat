import { NextRequest, NextResponse } from "next/server";

// pdf-parse is a CJS package; require it lazily inside the handler to avoid
// its index.js debug harness running at module load time.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel Hobby limite les requêtes à 4.5 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Le fichier doit être un PDF." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max 4 MB sur Vercel).` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Lazy require to avoid pdf-parse's top-level test-file read.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
      data: Buffer
    ) => Promise<{ text: string; numpages: number }>;

    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Impossible d'extraire du texte de ce PDF (scan image ?)." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      fileName: file.name,
      numPages: parsed.numpages,
      charCount: text.length,
      text,
    });
  } catch (err) {
    console.error("[/api/upload] error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'extraction du PDF." },
      { status: 500 }
    );
  }
}
