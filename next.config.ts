import type { NextConfig } from "next";

// Firebase App Hosting은 빌드 시 FIREBASE_WEBAPP_CONFIG(웹 앱 공개 설정)를 자동으로 넣어 준다.
// 이를 NEXT_PUBLIC_* 값으로 풀어 두면 로컬(.env.local)과 배포 환경에서 같은 코드를 쓸 수 있다.
function webAppConfig(): Record<string, string> {
  try {
    return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG ?? "{}");
  } catch {
    return {};
  }
}

const cfg = webAppConfig();
const pick = (name: string, key: string) => process.env[name] || cfg[key] || "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: pick("NEXT_PUBLIC_FIREBASE_API_KEY", "apiKey"),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: pick("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "authDomain"),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: pick("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "projectId"),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: pick("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "storageBucket"),
    NEXT_PUBLIC_FIREBASE_APP_ID: pick("NEXT_PUBLIC_FIREBASE_APP_ID", "appId"),
  },
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
