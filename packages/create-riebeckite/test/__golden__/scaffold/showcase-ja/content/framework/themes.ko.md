---
publish: true
---

# 테마

테마를 바꾸면 색상·타이포그래피·레이아웃 등 사이트 전체 분위기가 달라집니다. 콘텐츠나 라우트는 건드릴 필요가 없습니다. Riebeckite는 6개 테마를 제공하며 패키지 설치 후 한 줄만 바꾸면 전환됩니다.

## 테마 갤러리

```gallery
columns: 3
items:
  - title: "Default"
    description: "기본 테마: 깔끔한 디자인 토큰, 라이트/다크/시스템 컬러 모드, 아티클 레이아웃."
    meta: "defaultTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md"
  - title: "Minimal"
    description: "타이포그래피 우선의 차분한 테마."
    meta: "minimalTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md"
  - title: "Sakura"
    description: "부드러운 핑크 팔레트와 따뜻한 액센트."
    meta: "sakuraTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md"
  - title: "Gruvbox"
    description: "Gruvbox에서 영감을 받은 따뜻한 레트로 팔레트."
    meta: "gruvboxTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md"
  - title: "Tokyo Night"
    description: "네온 액센트를 선택할 수 있는 모던한 나이트 팔레트."
    meta: "tokyonightTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md"
  - title: "Rerurate"
    description: "저자의 개인 디자인 언어 테마."
    meta: "rerurateTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md"
```

## 테마 전환

이 스타터는 `@riebeckite/theme-default`를 사용합니다. 다른 테마를 시도하려면:

패키지를 설치합니다:

```sh
npm install @riebeckite/theme-sakura
```

`riebeckite.config.ts`의 `theme`를 새 팩토리로 변경합니다:

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme(),
});
```

## 내장 테마 목록

| 테마 | 설명 |
| --- | --- |
| [`@riebeckite/theme-default`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md) · `defaultTheme()` | 기본 테마: 깔끔한 디자인 토큰, 라이트/다크/시스템 컬러 모드, 아티클 레이아웃. |
| [`@riebeckite/theme-minimal`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md) · `minimalTheme()` | 타이포그래피 우선의 차분한 테마. |
| [`@riebeckite/theme-sakura`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md) · `sakuraTheme()` | 부드러운 핑크 팔레트와 따뜻한 액센트. |
| [`@riebeckite/theme-gruvbox`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md) · `gruvboxTheme()` | Gruvbox에서 영감을 받은 따뜻한 레트로 팔레트. |
| [`@riebeckite/theme-tokyonight`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md) · `tokyonightTheme()` | 네온 액센트를 선택할 수 있는 모던한 나이트 팔레트. |
| [`@riebeckite/theme-rerurate`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md) · `rerurateTheme()` | 저자의 개인 디자인 언어 테마. |

## 모든 테마가 라이트/다크 모드, 타이포그래피, 아티클 레이아웃을 지원합니다. 전체 옵션은 각 README를 참조하세요.


[Riebeckite themes on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/themes)

