# CLAUDE.md — 프로젝트 로그 & 개요

> 이 문서는 **매 세션 진행 상황 로그**입니다.
> 게임 규칙(불변)은 `SPEC.md`, 개발 순서/로드맵은 `PHASES.md`를 참고하세요.
> 셋을 같이 봐야 할 때: 새 세션 시작 시 세 문서를 함께 제공하면 컨텍스트가 바로 잡힙니다.

---

## 1. 게임 개요 (한 줄 요약)

사진으로 하는 끝말잇기. 올린 사람은 정답을 알고, 뒤에 오는 사람은 사진만 보고 추측해 잇는다.
비동기 다중 방 구조, 로그인 필요, 억지 끝말 신고로 무한 진행을 관리한다.

> 상세 규칙(정답 판정, 끝말 판정, 신고/무효 처리 등)은 전부 `SPEC.md`에 있음. 여기서는 중복 서술하지 않음.

---

## 2. 방(Room) 시스템 — 구조 요약

- **공개방**: 방 목록에 뜸, 아무나 입장
- **비밀방**: 방 목록엔 뜨되 입장 시 비밀번호 필요. 초대 코드가 있으면 비밀번호 생략 (Phase 9~11에서 구현 예정)

---

## 3. 로그인 — 구조 요약 (구현 완료)

- Supabase Auth 사용, 이메일 인증 절차 생략(Confirm email 끔)
- 로그인은 실제 이메일 + 비밀번호
- 닉네임(username)은 로그인 식별자와 분리 — 회원가입 시에만 입력, `profiles.username`에 저장(UNIQUE)
- `signUp` 호출 시 `options.data.username` → `raw_user_meta_data` → 트리거(`handle_new_user`)가 `profiles`에 `id`+`username` 삽입

---

## 4. 기술 스택

| 영역 | 도구 | 역할 |
|---|---|---|
| 프론트엔드 | React + Vite | UI, 화면, 상태 관리 |
| 개발 환경 | 로컬 컴퓨터 + Cursor | localhost로 미리보기하며 개발 |
| DB | Supabase (PostgreSQL) | 방·사진·정답·사슬·점수 저장, SQL 사용 |
| 사진 저장 | Supabase Storage | 이미지 파일 저장, URL만 DB에 기록. 무료 플랜 파일당 50MB 한도(넉넉함), 업로드 전 클라이언트 압축 예정(Phase 1) |
| 실시간 통신 | Supabase Realtime (Presence + Broadcast + Postgres Changes) | 사진/정답 실시간 갱신, 방 접속자 추적, 신고 즉석 동의(10초 타이머) 처리 — Phase 3에서 인프라 구축, Phase 6에서 신고 로직에 활용 |
| 외부 API 중계 | Supabase Edge Function (Deno) | 네이버 API 대신 호출 + 키 숨김 |
| 인증 | Supabase Auth | 로그인/가입 |
| 이미지 검색 | 네이버 이미지 검색 API | Phase 10(하향 조정)에서 다룸 — 성능 이슈로 후순위 |
| 배포 | Vercel | 프론트 배포, GitHub 연동 |
| 버전 관리 | GitHub | 코드 + README (수업 요구) |

### 키 숨김 구조
```
React(브라우저)  →  Supabase Edge Function(서버, 키 숨김)  →  네이버 API
     검색어 전송              숨긴 키로 호출                    이미지 결과
```
브라우저는 네이버 키를 만지지 않음. 키는 Supabase Secrets에만 보관.

### 운영 주의사항
- **Supabase 무료 플랜은 7일간 활동이 없으면 프로젝트가 자동 일시정지된다.** 게임이 비동기로 여러 날에 걸쳐 이어지는 특성상, 개발 중·배포 후 모두 최소 주 1회는 프로젝트에 접속해야 함.
- Realtime 무료 플랜: 동시 접속 200명, 메시지당 256KB — 신고 알림 등 텍스트 신호에는 충분(사진 파일과는 무관, 사진은 Storage로 별도 전송됨).
- Realtime Presence에 최근 프로덕션 환경 한정 이벤트 미수신 버그 사례 보고됨 — 탭 전환 시 재추적(re-track) 방어 코드 필요 (Phase 3에서 반영 예정).

---

## 5. 수업 요구사항 충족 매핑

| 요구사항 | 어떻게 충족 |
|---|---|
| 데이터 | Supabase에 방·정답·사슬·점수 저장 |
| SQL | Supabase = PostgreSQL, 실제 SQL 사용 |
| REST API | Supabase 자동 REST API + 네이버 API + Edge Function |
| 화면→API→저장→조회 | React 화면 → Supabase/Edge Function 호출 → DB 저장/조회 |
| AI 활용 설명 | 개발 도구로서 Cursor/Claude Code 활용 (게임 로직엔 AI 미사용, 그 이유도 설명거리) |
| 배포 | Vercel + Supabase (클라우드 상시 구동) |
| GitHub/README | GitHub 저장소 + 개발 과정 문서화 |

---

## 6. 진행 상황 로그

### Phase 도입 이전 — 환경 세팅 / 인증 / 방 시스템 (완료)

> 아래는 `PHASES.md` 체계를 도입하기 전에 완료한 작업입니다. Phase 0(스펙 정의)보다 시간상 먼저 이루어졌습니다.

**환경 세팅**
- [x] Node.js / npm 확인
- [x] React + Vite 프로젝트 생성 (`photo-word-chain`)
- [x] `npm run dev` 로컬 서버 구동 확인

**GitHub**
- [x] GitHub 저장소 생성 및 연결
- [x] 첫 커밋 + push 완료
- [x] `.env` (비밀 키) 가 GitHub에 안 올라가는 것 확인

**Supabase 초기 세팅**
- [x] Supabase 프로젝트 생성 (`photo-word-chain`, Tokyo 리전)
- [x] `@supabase/supabase-js` 설치, `.env` 등록, `supabaseClient.js` 작성
- [x] 테이블 6개(`profiles`, `rooms`, `turns`, `answers`, `messages`, `reports`) + `room_feed` 뷰 + `handle_new_user` 트리거 + RLS 기본 설정 완료
- [x] React ↔ Supabase 연결 테스트 완료 (RLS가 비로그인 요청 정상 차단 확인)

**로그인/가입**
- [x] 가입 화면 — 아이디 기반 → 이메일+비밀번호+닉네임 방식으로 변경 (배경: "닉네임은 자유롭게 바꿀 수 있어야 한다"는 요구로 구조 확정)
- [x] 로그인 화면 (이메일+비밀번호만), 세션 유지(`getSession`+`onAuthStateChange`), 로그아웃
- [x] 로그인/회원가입 탭 전환 UI (`Auth.jsx`, `mode` state)
- [x] 중복 가입 방지 검증 (이메일: Supabase Auth 자체 차단 / 닉네임: UNIQUE 제약, 트리거 실패 시 롤백 확인)

**겪은 문제 & 해결 (참고용)**
- `profiles.username` NOT NULL인데 트리거가 `id`만 넣어서 `Database error saving new user` 발생 → 트리거를 `raw_user_meta_data ->> 'username'` 읽도록 수정
- Confirm email 켜져 있어 반복 가입 테스트 시 `email rate limit exceeded` → 설정에서 끔

**방 시스템**
- [x] 방 만들기(공개방) — `RoomList.jsx`에 폼 추가, insert 후 목록 자동 갱신
- [x] 방 목록 화면
- [x] 방 입장 → 방 화면 이동 — `react-router-dom` 도입, `/`(로그인 전: Auth, 후: 로비) / `/room/:roomId`(RoomPage) 라우팅
- [x] 비로그인 상태로 `/room/:roomId` 직접 접근 시 `/`로 리다이렉트 확인
- [x] `RoomPage.jsx` — roomId로 방 정보 조회, 없으면 안내 후 목록으로 리다이렉트(현재는 안내 문구 없이 조용히 로비로 이동 — 콘솔 에러 없음, 기능상 문제 없음. UI 다듬기 단계(Phase 11)에서 개선 고려)
- [x] RLS 점검: 로그인 사용자는 `rooms`/`profiles` 조회 가능, 비로그인은 빈 배열로 차단됨을 확인

---

### Phase 0 — 스펙 정의 ✅ 완료

- [x] `SPEC.md` v0.1 작성 — 턴 상태 머신, 끝말 판정, 맞히기 비교 규칙, 정답 노출 규칙, 동시성 원칙
- [x] `PHASES.md` v0.1~0.2 작성 — Day 기준 → Phase 기준으로 재구성, 진행 현황 요약표 추가
- [x] 신고/투표 기능 우선순위 재검토 — Phase 6(배포 이전)으로 승격
- [x] 검색창 우선순위 재검토 — Phase 10(하향)으로 조정, 네이버 API 성능 이슈가 사유
- [x] `SPEC.md` v0.2 — 신고 규칙 최초 설계: 누적 참여자 만장일치제(활동 기반 참여자 정의, 스냅샷 고정, 최소 2명 조건)
- [x] "재접속 가능해야 함(오늘 끝나도 내일 이어서)" 요구사항 논의 → DB 기반 아키텍처로 이미 구조적으로 보장됨을 확인. 다만 이 특성이 만장일치제의 "참여자 계속 증가" 문제와 충돌함을 발견
- [x] `SPEC.md` v0.3 — 신고 규칙 재설계: 누적 참여자 만장일치제 폐기 → **실시간 접속자 즉석 동의(10초 타이머)** 방식으로 전환. Presence로 접속자 스냅샷, Broadcast로 신고 전파, 최소 인원 조건(신고자+피신고자 제외 0명이면 불가) 재정의
- [x] Supabase Realtime 기술 검증 — Presence/Broadcast가 멀티플레이어 게임 동기화에 공식 지원되는 사례임을 확인, 무료 플랜 한도(동시 접속 200, 메시지당 256KB)가 이 설계에 충분함을 확인. Presence 알려진 버그(탭 전환 시 이벤트 미수신) 발견, 방어 코드 필요성 기록
- [x] Storage/Realtime 용량 한도 혼동 해소 — 256KB는 Realtime 텍스트 메시지 한도이며 사진 파일과 무관, 실제 사진에 적용되는 한도는 Storage 파일당 50MB(무료 플랜)임을 확인
- [x] `SPEC.md` v0.4 — 5절에 기술 검증 결과 및 Presence 방어 코드 권장사항 반영
- [x] `PHASES.md` v0.3 — Phase 1에 업로드 전 이미지 압축 추가, Phase 3을 "사슬 조회 + Realtime 인프라"로 확장(Presence/Broadcast/Postgres Changes 선행 구축), Phase 6을 새 신고 방식에 맞게 체크리스트 전면 재작성, 무료 플랜 7일 자동 일시정지 운영 참고 추가

**다음 세션에서 할 일**: 세 문서(`SPEC.md` v0.4, `PHASES.md` v0.3, `CLAUDE.md`) 모두 최신 상태. 다음 실제 코드 작업은 **Phase 1(사진 업로드)** 착수.

---

### Phase 1 — 사진 업로드 (진행 중)

- [x] Supabase Storage 버킷(`turn-photos`, private) 생성 + RLS 정책(INSERT/SELECT, 인증 유저 전용) 설정
- [x] Storage RLS 검증 — anon 업로드 차단, anon 다운로드 차단(`404 Bucket not found`로 존재 자체를 숨김), `/object/public/` 우회 경로도 막혀 있어 버킷이 실수로 public 처리되지 않았음을 확인. 인증 유저는 업로드→다운로드 정상 동작
- [x] `turns` 테이블 RLS 점검 — 인증 유저 SELECT/INSERT 정상 동작 확인 (검증용 더미 행은 삭제해 정리함)
- [ ] 업로드 UI, 클라이언트 이미지 압축, 첫 턴/후속 턴 구분 검증은 아직 착수 전

**10분 작업 가능 여부 진단**: Phase 1 전체(압축 포함)는 10분 내 완료가 어렵다고 판단. 압축 없는 기본 업로드 흐름(파일 선택 → Storage 업로드 → `turns` insert → 화면 표시)까지만 10분 내 가능. 첫 턴/후속 턴 구분 검증은 지금 방들의 `turns`가 전부 0개라(Phase 2·4 미착수로 SOLVED 턴이 존재할 수 없음) 아직 만들어도 테스트가 안 됨 — 첫 턴 케이스만 우선 구현하는 걸로 방향 정함.

**다음 세션에서 할 일**: 압축 없는 기본 업로드 흐름부터 구현 (첫 턴 전용). 압축은 흐름이 동작한 뒤 별도로 붙이기.

---

## 7. 참고 — 지금 프로젝트에 있는 핵심 파일

```
photo-word-chain/
  ├─ .env                          ← Supabase URL/key (GitHub 비공개)
  ├─ docs/
  │   ├─ SPEC.md                   ← 게임 규칙 룰북 (v0.4)
  │   └─ PHASES.md                 ← 개발 로드맵 (v0.3, Phase 0~11)
  ├─ src/
  │   ├─ lib/supabaseClient.js     ← Supabase 연결 객체
  │   ├─ features/
  │   │   ├─ auth/Auth.jsx         ← 로그인/회원가입 탭 (이메일+비밀번호+닉네임)
  │   │   └─ rooms/
  │   │       ├─ RoomList.jsx      ← 방 목록 + 방 만들기 폼, 클릭 시 /room/:id로 이동
  │   │       └─ RoomPage.jsx      ← 방 상세 화면 (이름/만든 사람 표시, 게임 로직은 아직 뼈대)
  │   └─ App.jsx                   ← 세션 관리 + react-router 라우팅(/, /room/:roomId)
  └─ (Supabase: profiles/rooms/turns/answers/messages/reports 테이블 + handle_new_user 트리거
      + Storage 버킷 `turn-photos`(private, RLS 적용))
```

커밋 이력: `initial setup` → `feat: 회원가입, 로그인 기능 추가` → `feat: 방 만들기 및 조회 기능 추가` → `docs: SPEC/PHASES/CLAUDE 문서 추가 및 Phase 1 Storage 설정 반영`

---

## 8. 다음 세션 시작할 때

`CLAUDE.md` + `SPEC.md` + `PHASES.md` 세 문서를 Cursor/Claude Code 새 대화에 먼저 보여주면 맥락이 바로 잡힙니다. 지금 작업 중인 Phase가 명확하면 `PHASES.md`는 진행 현황 요약표만 발췌해도 충분합니다. 스키마가 필요한 작업이면 관련 테이블만 SQL Editor에서 조회해 붙여넣어 주세요 (스키마 파일은 별도로 관리하지 않기로 함).

---

## 변경 이력

- Day 3 시점 — 원본 CLAUDE.md 작성 (게임 규칙 + 진행 로그 통합 서술)
- Phase 체계 도입 시점 — 게임 규칙 상세를 SPEC.md로 이관, 진행 로그를 Phase 기준으로 재정리, PHASES.md/SPEC.md 참조 구조 명시
- SPEC v0.4 반영 시점 — 신고 규칙 재설계(만장일치제 → 실시간 즉석 동의) 및 Realtime 기술 검증 과정을 로그에 기록, 기술 스택 표에 Realtime 항목과 운영 주의사항(7일 자동 일시정지, Storage/Realtime 용량 한도) 추가
- Phase 1 착수 시점 — `turn-photos` Storage 버킷 + RLS 설정 완료 및 검증 기록, `turns` 테이블 RLS 점검 결과 기록, 업로드 UI/압축은 다음 세션으로 이월. `docs/` 폴더가 이 시점 처음으로 git에 커밋됨