import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import type { Criterion, CriterionResult } from "./types";

const DEFAULT_MODEL = "gemini-flash-latest";

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    studentName: {
      type: Type.STRING,
      description: "활동지에 적힌 학생 이름. 찾을 수 없으면 빈 문자열.",
    },
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterionId: { type: Type.STRING },
          score: { type: Type.NUMBER },
          rationale: { type: Type.STRING },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["criterionId", "score", "rationale", "suggestions"],
        propertyOrdering: ["criterionId", "score", "rationale", "suggestions"],
      },
    },
    overallFeedback: { type: Type.STRING },
  },
  required: ["studentName", "results", "overallFeedback"],
  propertyOrdering: ["studentName", "results", "overallFeedback"],
};

function buildPrompt(rubricTitle: string, rubricDescription: string, criteria: Criterion[]) {
  const list = criteria
    .map(
      (c, i) =>
        `${i + 1}. [criterionId: ${c.id}] ${c.name} (만점 ${c.maxScore}점)\n   기준 설명: ${c.description || "(설명 없음)"}`,
    )
    .join("\n");

  return `당신은 경험 많은 교사이며, 첨부된 PDF는 학생이 작성한 활동지입니다.
아래 평가 기준에 따라 활동지를 공정하고 구체적으로 평가하세요.

## 평가 기준: ${rubricTitle}
${rubricDescription ? `설명: ${rubricDescription}\n` : ""}
${list}

## 작성 규칙
- 모든 평가 항목에 대해 결과를 하나씩, 위에 적힌 criterionId를 그대로 사용해 작성하세요.
- score는 0 이상 만점 이하의 숫자입니다 (0.5점 단위 허용).
- rationale(판단 근거)에는 활동지에서 실제로 확인한 내용(학생이 쓴 문장, 그림, 풀이 등)을 구체적으로 인용하거나 짚어서 왜 그 점수인지 2~4문장으로 설명하세요.
- suggestions(개선 제안)에는 학생이 다음에 바로 실천할 수 있는 제안을 1~3개 쓰세요.
- 손글씨나 이미지가 읽기 어려운 부분은 추측하지 말고 "판독 어려움"이라고 근거에 밝히세요.
- 활동지에 해당 내용이 없으면 낮은 점수를 주고 그 이유를 적으세요.
- overallFeedback에는 학생에게 전할 총평을 3~5문장으로, 격려하는 어조로 쓰세요.
- 모든 문장은 한국어로 작성하세요.`;
}

export interface GeminiEvaluation {
  studentName: string;
  results: CriterionResult[];
  overallFeedback: string;
  totalScore: number;
  maxTotal: number;
}

export async function evaluatePdf(
  pdf: Buffer,
  rubric: { title: string; description: string; criteria: Criterion[] },
): Promise<GeminiEvaluation> {
  const response = await gemini().models.generateContent({
    model: geminiModel(),
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") } },
          { text: buildPrompt(rubric.title, rubric.description, rubric.criteria) },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini 응답이 비어 있습니다.");
  const parsed = JSON.parse(text) as {
    studentName?: string;
    results?: { criterionId: string; score: number; rationale: string; suggestions: string[] }[];
    overallFeedback?: string;
  };

  // 모델 응답을 기준 목록에 맞춰 정리하고, 점수를 배점 범위로 제한한다.
  const byId = new Map((parsed.results ?? []).map((r) => [r.criterionId, r]));
  const results: CriterionResult[] = rubric.criteria.map((c, i) => {
    const r = byId.get(c.id) ?? parsed.results?.[i];
    const score = Math.min(c.maxScore, Math.max(0, Number(r?.score) || 0));
    return {
      criterionId: c.id,
      name: c.name,
      maxScore: c.maxScore,
      score: Math.round(score * 2) / 2,
      rationale: r?.rationale?.trim() || "평가 결과를 받지 못했습니다.",
      suggestions: (r?.suggestions ?? []).map((s) => String(s).trim()).filter(Boolean),
    };
  });

  return {
    studentName: (parsed.studentName ?? "").trim(),
    results,
    overallFeedback: (parsed.overallFeedback ?? "").trim(),
    totalScore: results.reduce((sum, r) => sum + r.score, 0),
    maxTotal: rubric.criteria.reduce((sum, c) => sum + c.maxScore, 0),
  };
}
