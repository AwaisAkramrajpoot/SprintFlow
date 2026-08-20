import { useEffect, useMemo, useState } from "react";

import { USE_MOCK_API } from "../api/client";
import { taskflowApi } from "../api/taskflowApi";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, TextArea } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";

function statusTone(status) {
  if (status === "ready") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "sky";
  return "warning";
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function KnowledgeBasePage() {
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("What is our remote work policy?");
  const [history, setHistory] = useState([]);

  const loadDocuments = async () => {
    if (USE_MOCK_API) return;
    const data = await taskflowApi.listKnowledgeDocuments();
    setDocuments(data.items || []);
  };

  useEffect(() => {
    loadDocuments().catch((err) => setError(err.message || "Could not load documents"));
  }, []);

  const pendingIds = useMemo(
    () =>
      documents
        .filter((item) => ["pending", "processing"].includes(item.status))
        .map((item) => item.id)
        .join(","),
    [documents]
  );
  const hasReadyDoc = documents.some((item) => item.status === "ready");

  useEffect(() => {
    if (!pendingIds) return undefined;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > 12) {
        clearInterval(timer);
        return;
      }
      loadDocuments().catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [pendingIds]);

  const upload = async () => {
    if (!file || busy) return;
    if (USE_MOCK_API) {
      setError("Knowledge base needs the live API. Set VITE_USE_MOCK_API=false.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await taskflowApi.uploadKnowledgeDocument(file);
      setFile(null);
      setFileKey((current) => current + 1);
      await loadDocuments();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (documentId) => {
    if (USE_MOCK_API) return;
    setError("");
    try {
      await taskflowApi.deleteKnowledgeDocument(documentId);
      await loadDocuments();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const reprocess = async (documentId) => {
    if (USE_MOCK_API) return;
    setError("");
    try {
      await taskflowApi.reprocessKnowledgeDocument(documentId);
      await loadDocuments();
    } catch (err) {
      setError(err.message || "Reprocess failed");
    }
  };

  const ask = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || asking) return;
    if (USE_MOCK_API) {
      setError("Knowledge base needs the live API. Set VITE_USE_MOCK_API=false.");
      return;
    }
    const nextHistory = [...history, { role: "user", content: text }];
    setHistory(nextHistory);
    setQuestion("");
    setAsking(true);
    setError("");
    try {
      const data = await taskflowApi.askKnowledgeBase({ question: text });
      setHistory([
        ...nextHistory,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setError(err.message || "Ask failed");
    } finally {
      setAsking(false);
    }
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Knowledge"
        title="Company knowledge base"
        description="Upload policies, handbooks, and manuals. Ask questions and get answers grounded in your documents, with clear source references."
      />

      {error ? (
        <Card className="p-4 text-sm text-[var(--tf-danger)]">{error}</Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <p className="tf-eyebrow">Upload</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--tf-ink)]">Add a document</h3>
            <p className="mt-2 text-sm text-[var(--tf-muted)]">
              Supports PDF, DOCX, TXT, and Markdown. Processing usually finishes within a few seconds.
            </p>
            <Field label="File">
              <input
                key={fileKey}
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </Field>
            {file ? (
              <p className="mt-2 text-sm text-[var(--tf-muted)]">
                {file.name} · {formatBytes(file.size)}
              </p>
            ) : null}
            <Button
              className="mt-4"
              variant="primary"
              disabled={busy || !file}
              onClick={upload}
            >
              {busy ? "Uploading…" : "Upload and ingest"}
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="tf-eyebrow">Library</p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--tf-ink)]">
                  {documents.length} document{documents.length === 1 ? "" : "s"}
                </h3>
              </div>
              <Button onClick={() => loadDocuments().catch(() => {})}>Refresh</Button>
            </div>
            <div className="mt-4 space-y-3">
              {documents.length === 0 ? (
                <p className="text-sm text-[var(--tf-muted)]">
                  No documents yet. Upload a policy or handbook to get started.
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-[var(--tf-border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--tf-ink)]">{doc.original_name}</p>
                        <p className="mt-1 text-xs text-[var(--tf-muted)]">
                          {formatBytes(doc.size_bytes)} · {doc.chunk_count} chunks
                          {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ""}
                        </p>
                        {doc.error_message ? (
                          <p className="mt-2 text-xs text-[var(--tf-danger)]">
                            {doc.error_message}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                        {["pending", "failed", "processing"].includes(doc.status) ? (
                          <Button onClick={() => reprocess(doc.id)}>Retry</Button>
                        ) : null}
                        <Button
                          variant="danger"
                          onClick={() => remove(doc.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="flex min-h-[640px] flex-col p-6">
          <p className="tf-eyebrow">Ask</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--tf-ink)]">Ask documents</h3>
          <p className="mt-2 text-sm text-[var(--tf-muted)]">
            Answers include source filenames so your team can verify the original text.
          </p>
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto">
            {history.length === 0 ? (
              <p className="text-sm text-[var(--tf-muted)]">
                Ask anything about an uploaded document once it shows as ready.
              </p>
            ) : (
              history.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={[
                    "rounded-xl px-3 py-2 text-sm",
                    item.role === "user"
                      ? "ml-8 bg-[var(--tf-accent-soft)] text-[var(--tf-ink)]"
                      : "mr-4 bg-[var(--tf-bg-1)] text-[var(--tf-muted)]",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap">{item.content}</p>
                  {item.sources?.length ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tf-muted)]">
                        Sources
                      </p>
                      {item.sources.slice(0, 2).map((source) => (
                        <div
                          key={source.chunk_id}
                          className="rounded-lg border border-[var(--tf-border)] bg-white p-2 text-xs"
                        >
                          <p className="font-semibold text-[var(--tf-ink)]">
                            {source.filename}
                            {source.page ? ` · p.${source.page}` : ""}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[var(--tf-muted)]">
                            {source.excerpt}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <form className="mt-4 space-y-3" onSubmit={ask}>
            <Field label="Question">
              <TextArea
                rows={3}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={asking ? "Searching documents…" : "Ask a question"}
                disabled={asking}
              />
            </Field>
            <Button type="submit" variant="primary" disabled={asking || !hasReadyDoc}>
              {asking ? "Searching…" : "Ask"}
            </Button>
            {!hasReadyDoc ? (
              <p className="text-xs text-[var(--tf-muted)]">
                Upload a document and wait until it is ready before asking.
              </p>
            ) : null}
          </form>
        </Card>
      </div>
    </PageShell>
  );
}

export default KnowledgeBasePage;
