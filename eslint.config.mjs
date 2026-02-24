import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "renderer/dist/**",
    "renderer/src/**",
    "renderer/node_modules/**",
    "check-video-scenes.ts",
    "debug-last-attempt.ts",
    "fix-stuck-video.ts",
    "fix-video-add-images.ts",
    "test-complete-render-with-real-images.ts",
    "test-end-to-end-render.ts",
    "test-find-complete-video.ts",
    "test-fix-verification.ts",
    "src/app/api/video/route 2.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/index", "**/index.*"],
              message:
                "Barrel file imports are forbidden. Import directly from the source file.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "**/page.tsx",
      "**/layout.tsx",
      "**/route.ts",
      "**/loading.tsx",
      "**/error.tsx",
      "**/not-found.tsx",
      "**/template.tsx",
      "**/default.tsx",
    ],
    rules: {
      "no-restricted-exports": "off",
    },
  },
]);

export default eslintConfig;
