import type { EvaluationStatus } from "./types";

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: EvaluationStatus): string {
  return { processing: "평가 중", done: "완료", error: "오류" }[status];
}
