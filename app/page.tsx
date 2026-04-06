"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import ReactMarkdown from "react-markdown";

type ChatMessage = { role: "user" | "assistant"; content: string };

type DocInfo = {
  fileName: string;
  numPages: number;
  charCount: number;
  text: string;
};

export default function Page() {
  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isAnswering]);

  const uploadFile = useCallback(async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setMessages([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur upload.");
      setDoc(data as DocInfo);
    } catch (err) {
      setDoc(null);
      setUploadError(err instanceof Error ? err.message : "Erreur upload.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void uploadFile(f);
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    if (!doc) {
      setChatError("Uploadez d'abord un PDF.");
      return;
    }
    setChatError(null);

    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setIsAnswering(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText: doc.text, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur chat.");
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Erreur chat.");
    } finally {
      setIsAnswering(false);
    }
  };

  const resetDoc = () => {
    setDoc(null);
    setMessages([]);
    setChatError(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Docu<span className="text-accent">Chat</span>
          </h1>
          <p className="text-sm text-muted">
            Uploadez un PDF, posez vos questions.  DocuChat fonctionne avec les PDFs natifs (texte sélectionnable). Les PDFs scannés ou à base d'images ne sont pas supportés.
          </p>
        </div>
        {doc && (
          <button
            onClick={resetDoc}
            className="rounded-lg border border-border bg-panel px-3 py-1.5 text-xs text-muted transition hover:text-white"
          >
            Changer de PDF
          </button>
        )}
      </header>

      {!doc ? (
        <section>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center transition ${
              isDragging
                ? "border-accent bg-accent/5"
                : "border-border bg-panel hover:border-accent/60"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium">
                {isUploading ? "Extraction du texte..." : "Glissez un PDF ici"}
              </p>
              <p className="text-xs text-muted">
                ou cliquez pour parcourir · max 10 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
              }}
            />
          </div>
          {uploadError && (
            <p className="mt-3 text-sm text-red-400">{uploadError}</p>
          )}
        </section>
      ) : (
        <>
          <section className="flex items-center gap-3 rounded-xl border border-border bg-panel px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{doc.fileName}</p>
              <p className="text-xs text-muted">
                {doc.numPages} page{doc.numPages > 1 ? "s" : ""} ·{" "}
                {doc.charCount.toLocaleString("fr-FR")} caractères
              </p>
            </div>
          </section>

          <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-panel">
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto p-5"
              style={{ minHeight: 360, maxHeight: "55vh" }}
            >
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted">
                  Posez une première question sur votre document.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-accent text-white whitespace-pre-wrap"
                        : "bg-bg text-white/90 border border-border prose prose-invert prose-sm max-w-none"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isAnswering && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl border border-border bg-bg px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
                  </div>
                </div>
              )}
            </div>

            {chatError && (
              <div className="border-t border-border bg-red-500/10 px-5 py-2 text-xs text-red-300">
                {chatError}
              </div>
            )}

            <form
              onSubmit={onSend}
              className="flex gap-2 border-t border-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez une question sur le document..."
                disabled={isAnswering}
                className="flex-1 rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isAnswering || !input.trim()}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Envoyer
              </button>
            </form>
          </section>
        </>
      )}

      <footer className="pt-2 text-center text-xs text-muted">
        DocuChat
      </footer>
    </main>
  );
}
