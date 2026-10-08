import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { db, toIso } from "./firebase-admin";
import type { Evaluation, Rubric } from "./types";

export const rubricsCol = (uid: string) => db().collection("teachers").doc(uid).collection("rubrics");
export const evaluationsCol = (uid: string) =>
  db().collection("teachers").doc(uid).collection("evaluations");

export function rubricFromDoc(doc: DocumentSnapshot): Rubric {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    title: d.title ?? "",
    description: d.description ?? "",
    criteria: d.criteria ?? [],
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

export function evaluationFromDoc(doc: DocumentSnapshot): Evaluation {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    rubricId: d.rubricId ?? "",
    rubricTitle: d.rubricTitle ?? "",
    rubricSnapshot: d.rubricSnapshot ?? { title: "", description: "", criteria: [] },
    fileName: d.fileName ?? "",
    storagePath: d.storagePath ?? "",
    studentName: d.studentName ?? "",
    status: d.status ?? "processing",
    results: d.results ?? [],
    totalScore: d.totalScore ?? 0,
    maxTotal: d.maxTotal ?? 0,
    overallFeedback: d.overallFeedback ?? "",
    error: d.error,
    model: d.model,
    createdAt: toIso(d.createdAt),
  };
}
