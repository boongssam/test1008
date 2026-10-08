"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, apiJson } from "@/lib/api-client";
import { formatDate, statusLabel } from "@/lib/format";
import type { Evaluation } from "@/lib/types";

function EvaluationView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    apiJson<{ evaluation: Evaluation }>(`/api/evaluations/${id}`)
      .then(({ evaluation }) => setEv(evaluation))
      .catch((e) => setError(e.message));
  }, [id]);

  async function openPdf() {
    // 새 창은 사용자 클릭 시점에 먼저 열어 두어야 팝업 차단을 피할 수 있다.
    const win = window.open("", "_blank");
    setOpening(true);
    try {
      const res = await apiFetch(`/api/evaluations/${id}/pdf`);
      if (!res.ok) throw new Error("PDF를 불러오지 못했습니다.");
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      setError((e as Error).message);
    } finally {
      setOpening(false);
    }
  }

  async function remove() {
    if (!confirm("이 평가 결과와 업로드한 PDF를 삭제할까요?")) return;
    try {
      await apiJson(`/api/evaluations/${id}`, { method: "DELETE" });
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error && !ev) return <div className="alert">{error}</div>;
  if (!ev) return <p className="muted">불러오는 중…</p>;

  const pct = ev.maxTotal ? Math.round((ev.totalScore / ev.maxTotal) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <Link href="/" className="small no-print">
            ← 활동지 평가
          </Link>
          <h1 className="ellipsis">{ev.studentName ? `${ev.studentName} 학생` : ev.fileName}</h1>
          <div className="small muted">
            {ev.fileName} · {ev.rubricTitle} · {formatDate(ev.createdAt)}
          </div>
        </div>
        <div className="row no-print">
          <button className="btn ghost" onClick={openPdf} disabled={opening}>
            {opening ? "여는 중…" : "원본 PDF 보기"}
          </button>
          <button className="btn ghost" onClick={() => window.print()}>
            인쇄
          </button>
          <button className="btn danger" onClick={remove}>
            삭제
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {ev.status !== "done" ? (
        <div className="card">
          <span className={`badge ${ev.status}`}>{statusLabel(ev.status)}</span>
          <p>{ev.error ?? "평가가 아직 끝나지 않았습니다. 잠시 후 새로고침해 주세요."}</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="result-head">
              <div className="score-hero">
                <strong>{ev.totalScore}</strong>
                <span className="muted">/ {ev.maxTotal}점</span>
              </div>
              <span className="muted">{pct}%</span>
            </div>
            <div className="bar">
              <div style={{ width: `${pct}%` }} />
            </div>
            {ev.overallFeedback && (
              <>
                <div className="section-label">총평</div>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{ev.overallFeedback}</p>
              </>
            )}
          </div>

          {ev.results.map((r, i) => {
            const p = r.maxScore ? (r.score / r.maxScore) * 100 : 0;
            return (
              <div className="card result" key={r.criterionId}>
                <div className="result-head">
                  <h3>
                    {i + 1}. {r.name}
                  </h3>
                  <span className="result-score">
                    {r.score} / {r.maxScore}
                  </span>
                </div>
                <div className="bar">
                  <div style={{ width: `${p}%` }} />
                </div>
                <div className="section-label">판단 근거</div>
                <p>{r.rationale}</p>
                {r.suggestions.length > 0 && (
                  <>
                    <div className="section-label">개선 제안</div>
                    <ul>
                      {r.suggestions.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}

          <p className="small muted">
            AI가 작성한 평가입니다. 최종 점수는 교사가 확인 후 확정해 주세요.
            {ev.model ? ` (모델: ${ev.model})` : ""}
          </p>
        </>
      )}
    </>
  );
}

export default function EvaluationPage() {
  return (
    <AppShell>
      <EvaluationView />
    </AppShell>
  );
}
