import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, HttpError, requireTeacher } from "@/lib/auth-server";
import { bucket } from "@/lib/firebase-admin";
import { evaluatePdf, geminiModel } from "@/lib/gemini";
import { evaluationFromDoc, evaluationsCol, rubricFromDoc, rubricsCol } from "@/lib/serialize";

export const runtime = "nodejs";
export const maxDuration = 300;

// Gemini 인라인 PDF 요청 한도(약 20MB)를 넘지 않도록 제한
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const { uid } = await requireTeacher(req);

    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, "업로드 형식이 올바르지 않습니다.");
    const file = form.get("file");
    const rubricId = String(form.get("rubricId") ?? "");

    if (!(file instanceof File)) throw new HttpError(400, "PDF 파일을 선택해 주세요.");
    if (file.size === 0) throw new HttpError(400, "빈 파일입니다.");
    if (file.size > MAX_BYTES) throw new HttpError(400, "PDF는 15MB 이하만 업로드할 수 있습니다.");

    const buffer = Buffer.from(await file.arrayBuffer());
    // 확장자·MIME만 믿지 않고 파일 시그니처(%PDF-)를 확인한다.
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new HttpError(400, "PDF 파일만 업로드할 수 있습니다.");
    }

    const rubricDoc = await rubricsCol(uid).doc(rubricId || "_").get();
    if (!rubricId || !rubricDoc.exists) throw new HttpError(400, "평가 기준을 선택해 주세요.");
    const rubric = rubricFromDoc(rubricDoc);

    // 1) Cloud Storage에 원본 PDF 저장
    const evalRef = evaluationsCol(uid).doc();
    const fileName = file.name || "worksheet.pdf";
    const storagePath = `worksheets/${uid}/${evalRef.id}.pdf`;
    await bucket()
      .file(storagePath)
      .save(buffer, {
        contentType: "application/pdf",
        resumable: false,
        metadata: { metadata: { originalName: encodeURIComponent(fileName) } },
      });

    // 2) 평가 문서를 '처리 중' 상태로 먼저 만든다.
    const rubricSnapshot = {
      title: rubric.title,
      description: rubric.description,
      criteria: rubric.criteria,
    };
    await evalRef.set({
      rubricId: rubric.id,
      rubricTitle: rubric.title,
      rubricSnapshot,
      fileName,
      storagePath,
      studentName: "",
      status: "processing",
      results: [],
      totalScore: 0,
      maxTotal: rubric.criteria.reduce((s, c) => s + c.maxScore, 0),
      overallFeedback: "",
      model: geminiModel(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // 3) Gemini로 평가 후 결과 저장
    try {
      const result = await evaluatePdf(buffer, rubricSnapshot);
      await evalRef.update({ ...result, status: "done", completedAt: FieldValue.serverTimestamp() });
    } catch (err) {
      console.error("Gemini evaluation failed", err);
      await evalRef.update({
        status: "error",
        error: "AI 평가 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      });
    }

    return NextResponse.json({ evaluation: evaluationFromDoc(await evalRef.get()) });
  } catch (err) {
    return errorResponse(err);
  }
}
