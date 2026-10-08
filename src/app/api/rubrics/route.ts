import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { errorResponse, requireTeacher } from "@/lib/auth-server";
import { parseRubricInput } from "@/lib/rubric-validate";
import { rubricFromDoc, rubricsCol } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { uid } = await requireTeacher(req);
    const snap = await rubricsCol(uid).orderBy("updatedAt", "desc").get();
    return NextResponse.json({ rubrics: snap.docs.map(rubricFromDoc) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { uid } = await requireTeacher(req);
    const input = parseRubricInput(await req.json().catch(() => null));
    const ref = await rubricsCol(uid).add({
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ rubric: rubricFromDoc(await ref.get()) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
