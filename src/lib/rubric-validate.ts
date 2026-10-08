import "server-only";
import { HttpError } from "./auth-server";
import type { Criterion } from "./types";

export interface RubricInput {
  title: string;
  description: string;
  criteria: Criterion[];
}

/** 클라이언트가 보낸 평가 기준을 검증·정리한다. */
export function parseRubricInput(body: unknown): RubricInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = String(b.title ?? "").trim();
  const description = String(b.description ?? "").trim();
  if (!title) throw new HttpError(400, "평가 기준 이름을 입력해 주세요.");
  if (!Array.isArray(b.criteria) || b.criteria.length === 0) {
    throw new HttpError(400, "평가 항목을 하나 이상 추가해 주세요.");
  }
  if (b.criteria.length > 20) throw new HttpError(400, "평가 항목은 20개까지 만들 수 있습니다.");

  const seen = new Set<string>();
  const criteria = b.criteria.map((raw, i) => {
    const c = (raw ?? {}) as Record<string, unknown>;
    const name = String(c.name ?? "").trim();
    const maxScore = Number(c.maxScore);
    if (!name) throw new HttpError(400, `${i + 1}번째 항목의 이름을 입력해 주세요.`);
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) {
      throw new HttpError(400, `'${name}' 항목의 배점은 1~1000 사이여야 합니다.`);
    }
    let id = String(c.id ?? "").trim() || crypto.randomUUID();
    if (seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    return {
      id,
      name: name.slice(0, 100),
      description: String(c.description ?? "").trim().slice(0, 2000),
      maxScore: Math.round(maxScore * 10) / 10,
    };
  });

  return { title: title.slice(0, 100), description: description.slice(0, 2000), criteria };
}
