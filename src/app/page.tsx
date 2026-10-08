"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { apiJson } from "@/lib/api-client";
import { formatDate, statusLabel } from "@/lib/format";
import type { Evaluation, Rubric } from "@/lib/types";

const MAX_MB = 15;

function Dashboard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
  const [rubricId, setRubricId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson<{ rubrics: Rubric[] }>("/api/rubrics")
      .then(({ rubrics }) => {
        setRubrics(rubrics);
        if (rubrics[0]) setRubricId(rubrics[0].id);
      })
      .catch((e) => setError(e.message));
    apiJson<{ evaluations: Evaluation[] }>("/api/evaluations")
      .then(({ evaluations }) => setEvaluations(evaluations))
      .catch((e) => setError(e.message));
  }, []);

  function pick(f: File | undefined | null) {
    setError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF 파일만 올릴 수 있습니다.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`PDF는 ${MAX_MB}MB 이하만 올릴 수 있습니다.`);
      return;
    }
    setFile(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files[0]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !rubricId) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("rubricId", rubricId);
      const { evaluation } = await apiJson<{ evaluation: Evaluation }>("/api/evaluate", {
        method: "POST",
        body: form,
      });
      router.push(`/evaluations/${evaluation.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const selected = rubrics?.find((r) => r.id === rubricId);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>활동지 평가</h1>
          <p className="muted" style={{ margin: 0 }}>
            학생 활동지 PDF를 올리면 Gemini가 평가 기준에 따라 점수와 근거, 개선 제안을 작성합니다.
          </p>
        </div>
      </div>

      <form className="card" onSubmit={onSubmit}>
        <h2>새 평가</h2>
        {error && <div className="alert">{error}</div>}

        {rubrics && rubrics.length === 0 ? (
          <div className="alert info">
            먼저 평가 기준을 만들어 주세요. <Link href="/rubrics/new">평가 기준 만들기 →</Link>
          </div>
        ) : (
          <label className="field">
            <span>평가 기준</span>
            <select value={rubricId} onChange={(e) => setRubricId(e.target.value)} disabled={!rubrics}>
              {!rubrics && <option>불러오는 중…</option>}
              {rubrics?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.criteria.length}개 항목 · {r.criteria.reduce((s, c) => s + c.maxScore, 0)}점)
                </option>
              ))}
            </select>
          </label>
        )}
        {selected && (
          <p className="small muted" style={{ marginTop: -6 }}>
            {selected.criteria.map((c) => `${c.name}(${c.maxScore})`).join(" · ")}
          </p>
        )}

        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          {file ? (
            <>
              <strong>{file.name}</strong>
              <div className="small muted">{(file.size / 1024 / 1024).toFixed(2)}MB · 클릭해서 다른 파일 선택</div>
            </>
          ) : (
            <>
              <strong>PDF 파일을 끌어다 놓거나 클릭해서 선택</strong>
              <div className="small muted">최대 {MAX_MB}MB</div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          {busy && <span className="small muted">AI가 활동지를 읽고 있어요. 30초~1분 정도 걸릴 수 있습니다.</span>}
          <button className="btn" type="submit" disabled={!file || !rubricId || busy}>
            {busy && <span className="spinner" />}
            {busy ? "평가 중…" : "AI 평가 시작"}
          </button>
        </div>
      </form>

      <div className="card">
        <h2>최근 평가 결과</h2>
        {!evaluations ? (
          <p className="muted">불러오는 중…</p>
        ) : evaluations.length === 0 ? (
          <p className="muted">아직 평가한 활동지가 없습니다.</p>
        ) : (
          <ul className="list">
            {evaluations.map((ev) => (
              <li key={ev.id}>
                <div className="grow">
                  <Link href={`/evaluations/${ev.id}`} className="ellipsis" style={{ display: "block" }}>
                    {ev.studentName ? `${ev.studentName} · ` : ""}
                    {ev.fileName}
                  </Link>
                  <div className="small muted">
                    {ev.rubricTitle} · {formatDate(ev.createdAt)}
                  </div>
                </div>
                {ev.status === "done" ? (
                  <strong>
                    {ev.totalScore} / {ev.maxTotal}
                  </strong>
                ) : (
                  <span className={`badge ${ev.status}`}>{statusLabel(ev.status)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
