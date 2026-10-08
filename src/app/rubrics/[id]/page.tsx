"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { apiJson } from "@/lib/api-client";
import type { Criterion, Rubric } from "@/lib/types";

const newCriterion = (): Criterion => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  maxScore: 10,
});

const EXAMPLE: Criterion[] = [
  {
    id: "",
    name: "내용 이해",
    description: "학습 주제의 핵심 개념을 정확히 이해하고 자신의 말로 설명했는가?",
    maxScore: 10,
  },
  {
    id: "",
    name: "근거 제시",
    description: "주장이나 답에 대해 자료, 관찰, 예시 등 알맞은 근거를 들었는가?",
    maxScore: 10,
  },
  {
    id: "",
    name: "표현과 정리",
    description: "글, 그림, 표 등을 활용해 생각을 알아보기 쉽게 정리했는가?",
    maxScore: 5,
  },
  {
    id: "",
    name: "성실성",
    description: "모든 문항에 빠짐없이 성의 있게 답했는가?",
    maxScore: 5,
  },
];

function RubricEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>(isNew ? [newCriterion()] : []);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) return;
    apiJson<{ rubric: Rubric }>(`/api/rubrics/${id}`)
      .then(({ rubric }) => {
        setTitle(rubric.title);
        setDescription(rubric.description);
        setCriteria(rubric.criteria);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  function update(index: number, patch: Partial<Criterion>) {
    setSaved(false);
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function move(index: number, dir: -1 | 1) {
    setCriteria((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = JSON.stringify({ title, description, criteria });
      if (isNew) {
        const { rubric } = await apiJson<{ rubric: Rubric }>("/api/rubrics", { method: "POST", body });
        router.replace(`/rubrics/${rubric.id}`);
      } else {
        const { rubric } = await apiJson<{ rubric: Rubric }>(`/api/rubrics/${id}`, { method: "PUT", body });
        setCriteria(rubric.criteria);
        setSaved(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  const total = criteria.reduce((s, c) => s + (Number(c.maxScore) || 0), 0);

  return (
    <form onSubmit={onSubmit}>
      <div className="page-head">
        <div>
          <Link href="/rubrics" className="small">
            ← 평가 기준 목록
          </Link>
          <h1>{isNew ? "새 평가 기준" : "평가 기준 수정"}</h1>
        </div>
        <div className="row">
          {saved && <span className="small" style={{ color: "var(--success)" }}>저장했습니다</span>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        <label className="field">
          <span>이름</span>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            placeholder="예: 5학년 과학 3단원 탐구 활동지"
            required
          />
        </label>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>설명 · 과제 안내 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSaved(false);
            }}
            placeholder="활동지의 학습 목표, 학년, 과제 내용 등을 적으면 AI가 더 정확하게 평가합니다."
          />
        </label>
      </div>

      <div className="card">
        <div className="result-head" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>평가 항목</h2>
          <span className="muted small">
            {criteria.length}개 항목 · 총 {total}점
          </span>
        </div>

        {criteria.map((c, i) => (
          <div className="criterion" key={c.id || i}>
            <div className="criterion-head">
              <label className="field" style={{ margin: 0 }}>
                <span>
                  {i + 1}. 항목 이름
                </span>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="예: 근거 제시"
                  required
                />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span>배점</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={0.5}
                  value={c.maxScore}
                  onChange={(e) => update(i, { maxScore: Number(e.target.value) })}
                  required
                />
              </label>
              <div className="row">
                <button type="button" className="btn ghost small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">
                  ↑
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => move(i, 1)}
                  disabled={i === criteria.length - 1}
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn danger small"
                  onClick={() => setCriteria((prev) => prev.filter((_, j) => j !== i))}
                  disabled={criteria.length === 1}
                >
                  삭제
                </button>
              </div>
            </div>
            <textarea
              value={c.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="무엇을 보고 어떻게 점수를 줄지 적어 주세요. 예: 상(9~10) 자료를 두 개 이상 근거로 듦 / 중(5~8) … / 하(0~4) …"
            />
          </div>
        ))}

        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setCriteria((prev) => [...prev, newCriterion()])}>
            + 항목 추가
          </button>
          {isNew && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCriteria(EXAMPLE.map((c) => ({ ...c, id: crypto.randomUUID() })))}
            >
              예시 항목 불러오기
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export default function RubricEditPage() {
  return (
    <AppShell>
      <RubricEditor />
    </AppShell>
  );
}
