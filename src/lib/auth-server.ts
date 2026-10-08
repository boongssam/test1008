import "server-only";
import { NextResponse } from "next/server";
import { adminAuth } from "./firebase-admin";

export interface Teacher {
  uid: string;
  email: string;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function allowedEmails(): string[] {
  return (process.env.ALLOWED_TEACHER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Authorization: Bearer <Firebase ID 토큰>을 검증하고 교사 정보를 돌려준다. */
export async function requireTeacher(req: Request): Promise<Teacher> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "로그인이 필요합니다.");

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, "로그인 정보가 만료되었습니다. 다시 로그인해 주세요.");
  }

  const email = (decoded.email ?? "").toLowerCase();
  const allow = allowedEmails();
  if (allow.length > 0 && !allow.includes(email)) {
    throw new HttpError(403, "허용된 교사 계정이 아닙니다.");
  }
  return { uid: decoded.uid, email };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}
