import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, HttpError, requireTeacher } from "@/lib/auth-server";
import { parseRubricInput } from "@/lib/rubric-validate";
import { rubricFromDoc, rubricsCol } from "@/lib/serialize";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const { id } = await params;
    const doc = await rubricsCol(uid).doc(id).get();
    if (!doc.exists) throw new HttpError(404, "평가 기준을 찾을 수 없습니다.");
    return NextResponse.json({ rubric: rubricFromDoc(doc) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const { id } = await params;
    const input = parseRubricInput(await req.json().catch(() => null));
    const ref = rubricsCol(uid).doc(id);
    if (!(await ref.get()).exists) throw new HttpError(404, "평가 기준을 찾을 수 없습니다.");
    await ref.update({ ...input, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ rubric: rubricFromDoc(await ref.get()) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { uid } = await requireTeacher(req);
    const { id } = await params;
    // 이미 끝난 평가 결과는 기준 사본(rubricSnapshot)을 갖고 있으므로 그대로 남는다.
    await rubricsCol(uid).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
