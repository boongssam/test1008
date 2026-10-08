import { errorResponse, HttpError, requireTeacher } from "@/lib/auth-server";
import { bucket } from "@/lib/firebase-admin";
import { evaluationFromDoc, evaluationsCol } from "@/lib/serialize";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** 업로드한 원본 PDF를 서버를 거쳐 내려준다 (Storage 직접 접근은 규칙으로 막혀 있음). */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const { id } = await params;
    const doc = await evaluationsCol(uid).doc(id).get();
    if (!doc.exists) throw new HttpError(404, "평가 결과를 찾을 수 없습니다.");
    const { storagePath, fileName } = evaluationFromDoc(doc);

    const [contents] = await bucket().file(storagePath).download();
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
