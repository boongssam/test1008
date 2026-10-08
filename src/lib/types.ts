export interface Criterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export interface Rubric {
  id: string;
  title: string;
  description: string;
  criteria: Criterion[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CriterionResult {
  criterionId: string;
  name: string;
  maxScore: number;
  score: number;
  rationale: string;
  suggestions: string[];
}

export type EvaluationStatus = "processing" | "done" | "error";

export interface Evaluation {
  id: string;
  rubricId: string;
  rubricTitle: string;
  rubricSnapshot: Pick<Rubric, "title" | "description" | "criteria">;
  fileName: string;
  storagePath: string;
  studentName: string;
  status: EvaluationStatus;
  results: CriterionResult[];
  totalScore: number;
  maxTotal: number;
  overallFeedback: string;
  error?: string;
  model?: string;
  createdAt: string | null;
}
