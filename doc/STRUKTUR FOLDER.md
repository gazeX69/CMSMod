modern-cms/
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ config/
│  │  │  ├─ database/
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ users/
│  │  │  │  ├─ content/
│  │  │  │  ├─ media/
│  │  │  │  ├─ themes/
│  │  │  │  ├─ plugins/
│  │  │  │  ├─ settings/
│  │  │  │  └─ public-site/
│  │  │  ├─ routes/
│  │  │  ├─ services/
│  │  │  ├─ hooks/
│  │  │  ├─ utils/
│  │  │  ├─ app.ts
│  │  │  └─ server.ts
│  │  ├─ drizzle/
│  │  │  ├─ migrations/
│  │  │  └─ schema/
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  └─ admin/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ pages/
│     │  │  ├─ login/
│     │  │  ├─ dashboard/
│     │  │  ├─ content/
│     │  │  ├─ media/
│     │  │  ├─ themes/
│     │  │  ├─ plugins/
│     │  │  └─ settings/
│     │  ├─ components/
│     │  ├─ layouts/
│     │  ├─ services/
│     │  ├─ stores/
│     │  ├─ hooks/
│     │  ├─ types/
│     │  └─ main.tsx
│     ├─ public/
│     ├─ package.json
│     └─ tsconfig.json
│
├─ packages/
│  ├─ core/
│  │  ├─ src/
│  │  │  ├─ content/
│  │  │  ├─ plugin/
│  │  │  ├─ theme/
│  │  │  ├─ permissions/
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ sdk/
│  │  ├─ src/
│  │  │  ├─ plugin-sdk.ts
│  │  │  ├─ theme-sdk.ts
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  └─ shared/
│     ├─ src/
│     │  ├─ types/
│     │  ├─ validators/
│     │  ├─ constants/
│     │  └─ index.ts
│     └─ package.json
│
├─ themes/
│  └─ default/
│     ├─ theme.json
│     ├─ templates/
│     │  ├─ layout.html
│     │  ├─ home.html
│     │  ├─ page.html
│     │  └─ post.html
│     ├─ assets/
│     │  ├─ css/
│     │  └─ js/
│     └─ screenshot.png
│
├─ plugins/
│  ├─ seo-basic/
│  │  ├─ plugin.json
│  │  └─ src/
│  │
│  ├─ contact-form/
│  │  ├─ plugin.json
│  │  └─ src/
│  │
│  └─ gallery/
│     ├─ plugin.json
│     └─ src/
│
├─ storage/
│  ├─ media/
│  ├─ cache/
│  ├─ logs/
│  └─ temp/
│
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ DEVELOPMENT_RULES.md
│  ├─ ROADMAP.md
│  ├─ PLUGIN_SYSTEM.md
│  ├─ THEME_SYSTEM.md
│  └─ DEPLOYMENT.md
│
├─ scripts/
│  ├─ dev.ts
│  ├─ build.ts
│  └─ setup.ts
│
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md