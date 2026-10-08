import { NextResponse } from "next/server";
import { errorResponse, HttpError, requireTeacher } from "@/lib/auth-server";
import { bucket } from "@/lib/firebase-admin";
import { evaluationFromDoc, evaluationsCol } from "@/lib/serialize";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const { id } = await params;
    const doc = await evaluationsCol(uid).doc(id).get();
    if (!doc.exists) throw new HttpError(404, "평가 결과를 찾을 수 없습니다.");
    return NextResponse.json({ evaluation: evaluationFromDoc(doc) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const { id } = await params;
    const ref = evaluationsCol(uid).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new HttpError(404, "평가 결과를 찾을 수 없습니다.");
    const { storagePath } = evaluationFromDoc(doc);
    if (storagePath) await bucket().file(storagePath).delete({ ignoreNotFound: true });
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
