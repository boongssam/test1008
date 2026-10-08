import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function resolveBucket(): string | undefined {
  if (process.env.FIREBASE_STORAGE_BUCKET) return process.env.FIREBASE_STORAGE_BUCKET;
  // App Hosting은 런타임에 FIREBASE_CONFIG를 자동으로 넣어 준다.
  try {
    const cfg = JSON.parse(process.env.FIREBASE_CONFIG ?? "{}");
    if (cfg.storageBucket) return cfg.storageBucket;
  } catch {
    /* ignore */
  }
  return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;
}

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const storageBucket = resolveBucket();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined;

  // 선택: 서비스 계정 JSON을 통째로 환경 변수에 넣은 경우
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
      storageBucket,
    });
  }
  // App Hosting(기본 서비스 계정) 또는 GOOGLE_APPLICATION_CREDENTIALS 사용
  return initializeApp({ storageBucket, projectId });
}

export const adminAuth = () => getAuth(adminApp());
export const db = () => getFirestore(adminApp());
export const bucket = () => getStorage(adminApp()).bucket();

export function toIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}
