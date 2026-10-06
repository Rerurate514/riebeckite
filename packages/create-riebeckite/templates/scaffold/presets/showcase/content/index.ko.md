---
publish: true
---

# {{title}}
Riebeckite 사이트에 오신 것을 환영합니다.
이 스타터의 모든 페이지는 7개 언어로 제공됩니다. 페이지 제목 아래 선택기로 전환하세요.
## Riebeckite란?
Riebeckite는 일반 Markdown(Obsidian에서 관리하는 노트)에서 빠른 정적 사이트를 만드는 확장 가능한 콘텐츠 우선 프레임워크입니다. 생태계에는 50개 이상의 플러그인과 6개 테마가 있으며, 이 사이트가 그 두 가지를 보여줍니다.
## 더 살펴보기
- [플러그인 — 기능별 대표 패키지](/framework/plugins)
- [테마 — 내장 디자인 패키지와 전환 방법](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)
## 사이트 편집
콘텐츠는 `content/`에 일반 Markdown으로 저장됩니다. 파일을 추가하고 프론트매터에 `publish: true`를 쓰면 빌드된 사이트에 나타납니다.
번역 페이지는 기본 파일 옆에 `<base>.<lang>.md` 규칙으로 둡니다(예: `about.ja.md`). l10n 플러그인이 `/lang/` 경로로 서빙하며 자동으로 링크합니다.
