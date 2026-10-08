"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiJson } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Rubric } from "@/lib/types";

function RubricList() {
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson<{ rubrics: Rubric[] }>("/api/rubrics")
      .then(({ rubrics }) => setRubrics(rubrics))
      .catch((e) => setError(e.message));
  }, []);

  async function remove(r: Rubric) {
    if (!confirm(`'${r.title}' 평가 기준을 삭제할까요?\n이미 끝난 평가 결과는 그대로 남습니다.`)) return;
    try {
      await apiJson(`/api/rubrics/${r.id}`, { method: "DELETE" });
      setRubrics((prev) => prev?.filter((x) => x.id !== r.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>평가 기준</h1>
          <p className="muted" style={{ margin: 0 }}>
            활동지 평가에 사용할 항목과 배점을 관리합니다.
          </p>
        </div>
        <Link href="/rubrics/new" className="btn">
          + 새 평가 기준
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        {!rubrics ? (
          <p className="muted">불러오는 중…</p>
        ) : rubrics.length === 0 ? (
          <p className="muted">아직 평가 기준이 없습니다. 오른쪽 위 버튼으로 만들어 보세요.</p>
        ) : (
          <ul className="list">
            {rubrics.map((r) => (
              <li key={r.id}>
                <div className="grow">
                  <Link href={`/rubrics/${r.id}`}>
                    <strong>{r.title}</strong>
                  </Link>
                  <div className="small muted ellipsis">
                    {r.criteria.length}개 항목 · 총 {r.criteria.reduce((s, c) => s + c.maxScore, 0)}점 · 수정{" "}
                    {formatDate(r.updatedAt)}
                  </div>
                </div>
                <div className="row">
                  <Link href={`/rubrics/${r.id}`} className="btn ghost small">
                    수정
                  </Link>
                  <button className="btn danger small" onClick={() => remove(r)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function RubricsPage() {
  return (
    <AppShell>
      <RubricList />
    </AppShell>
  );
}
