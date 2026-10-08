# 활동지 AI 평가

학생 활동지 PDF를 올리면 Gemini가 교사가 정한 평가 기준에 따라 **기준별 점수, 판단 근거, 개선 제안**을 작성해 주는 Next.js 웹 앱입니다.

- 교사 로그인: Firebase Authentication (Google 또는 이메일/비밀번호)
- 평가 기준 입력·수정·삭제
- PDF 원본 저장: Cloud Storage for Firebase
- 평가 기준·결과 저장: Cloud Firestore
- AI 평가: Gemini API (**서버에서만 호출**, API 키는 Secret Manager에 보관)
- 배포: Firebase App Hosting

## 구조

```
브라우저 ── Firebase Auth 로그인 (ID 토큰 발급)
   │
   │  Authorization: Bearer <ID 토큰>
   ▼
Next.js 서버 (App Hosting / Cloud Run)
   ├─ 토큰 검증 (firebase-admin)
   ├─ PDF → Cloud Storage   worksheets/{uid}/{evaluationId}.pdf
   ├─ PDF + 평가 기준 → Gemini (구조화된 JSON 응답)
   └─ 결과 → Firestore      teachers/{uid}/rubrics, teachers/{uid}/evaluations
```

브라우저는 로그인만 직접 하고, Firestore·Storage·Gemini 접근은 모두 서버 API(`src/app/api/*`)를 거칩니다.
그래서 `firestore.rules`, `storage.rules`는 클라이언트 직접 접근을 **모두 차단**합니다. (Admin SDK는 규칙의 영향을 받지 않음)

| 경로 | 설명 |
| --- | --- |
| `src/lib/gemini.ts` | Gemini 호출, 프롬프트, 응답 스키마, 점수 범위 보정 |
| `src/lib/auth-server.ts` | ID 토큰 검증, 허용 교사 이메일 확인 |
| `src/lib/firebase-admin.ts` | Admin SDK 초기화 (Firestore/Storage/Auth) |
| `src/app/api/evaluate/route.ts` | PDF 업로드 → Storage 저장 → Gemini 평가 → Firestore 저장 |
| `src/app/api/rubrics/*` | 평가 기준 CRUD |
| `src/app/api/evaluations/*` | 평가 결과 조회·삭제, 원본 PDF 내려받기 |
| `apphosting.yaml` | App Hosting 런타임 설정, 비밀 값 연결 |

## 1. Firebase 프로젝트 준비

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만들고 **Blaze(종량제) 요금제**로 전환합니다. (App Hosting에 필요)
2. **Authentication** → 로그인 방법에서 **Google**, **이메일/비밀번호**를 사용 설정합니다.
3. **Firestore Database**를 만듭니다 (프로덕션 모드, 지역 예: `asia-northeast3` 서울).
4. **Storage**를 시작합니다.
5. 프로젝트 설정 → 내 앱에서 **웹 앱**을 추가합니다 (로컬 개발 시 설정값 사용).
6. [Google AI Studio](https://aistudio.google.com/apikey)에서 **Gemini API 키**를 발급합니다.

## 2. 로컬 개발

```bash
npm install
cp .env.example .env.local      # 값 채우기
npm run dev                     # http://localhost:3000
```

서버의 Admin SDK 인증은 둘 중 하나로 합니다.
- 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → `service-account.json`으로 저장하고 `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` (이 파일은 `.gitignore`에 포함되어 있음, 절대 커밋 금지)
- 또는 `gcloud auth application-default login`

## 3. 보안 규칙 배포

```bash
npm install -g firebase-tools
firebase login
firebase use --add                       # 프로젝트 선택
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## 4. App Hosting 배포

1. 이 코드를 GitHub 저장소에 올립니다.
2. Gemini API 키를 Secret Manager에 저장합니다 (App Hosting 백엔드 접근 권한 부여 질문에 **Yes**).
   ```bash
   firebase apphosting:secrets:set GEMINI_API_KEY
   ```
3. 백엔드를 만들고 GitHub 저장소를 연결합니다.
   ```bash
   firebase apphosting:backends:create
   ```
   (또는 콘솔 → App Hosting → 시작하기). 이후 연결한 브랜치에 push할 때마다 자동으로 배포됩니다.
4. 배포 후 받은 주소(`https://<백엔드>--<프로젝트>.<지역>.hosted.app`)를 **Authentication → 설정 → 승인된 도메인**에 추가해야 Google 로그인이 동작합니다.

App Hosting은 빌드 시 `FIREBASE_WEBAPP_CONFIG`, 실행 시 `FIREBASE_CONFIG`를 자동으로 넣어 주므로 웹 앱 설정값·버킷 이름은 따로 입력하지 않아도 됩니다 (`next.config.ts`, `src/lib/firebase-admin.ts` 참고).

### 설정 값 (`apphosting.yaml`)

| 변수 | 설명 |
| --- | --- |
| `GEMINI_API_KEY` | Secret Manager의 비밀 값. 런타임에만 서버에 주입 |
| `GEMINI_MODEL` | 사용할 모델. 기본 `gemini-flash-latest` (항상 최신 Flash를 가리키는 별칭). 결과를 고정하고 싶으면 특정 버전 이름으로 바꾸세요 |
| `ALLOWED_TEACHER_EMAILS` | 사용을 허용할 교사 이메일(쉼표 구분). **배포 시 꼭 채우세요.** 비워 두면 계정을 만든 누구나 Gemini 사용량을 쓸 수 있습니다 |

## 문제 해결

- **`PERMISSION_DENIED` (Firestore/Storage)**: App Hosting 서비스 계정(`firebase-app-hosting-compute@<프로젝트>.iam.gserviceaccount.com`)에 IAM 역할 `Cloud Datastore 사용자`, `스토리지 객체 관리자`를 부여합니다.
- **Google 로그인 팝업 오류 `auth/unauthorized-domain`**: 4-4단계의 승인된 도메인 추가를 확인합니다.
- **AI 평가 오류**: App Hosting 로그(콘솔 → App Hosting → 로그)에서 `Gemini evaluation failed`를 확인합니다. 모델 이름이 잘못됐거나 API 키 권한 문제인 경우가 많습니다.
- **PDF 크기**: Gemini 인라인 요청 한도 때문에 15MB까지만 받습니다.

## 참고

AI가 매긴 점수는 참고용입니다. 결과 화면에도 "최종 점수는 교사가 확인 후 확정"하도록 안내 문구가 있습니다.
