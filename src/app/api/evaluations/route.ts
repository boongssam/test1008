import { NextResponse } from "next/server";
import { errorResponse, requireTeacher } from "@/lib/auth-server";
import { evaluationFromDoc, evaluationsCol } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { uid } = await requireTeacher(req);
    const snap = await evaluationsCol(uid).orderBy("createdAt", "desc").limit(100).get();
    return NextResponse.json({ evaluations: snap.docs.map(evaluationFromDoc) });
  } catch (err) {
    return errorResponse(err);
  }
}
