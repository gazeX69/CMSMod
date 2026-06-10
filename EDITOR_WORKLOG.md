# Editor Worklog

## 2026-06-07

- Membaca request editor ModernCMS dari attachment.
- Memvalidasi prinsip arsitektur terhadap `docs/EDITOR_ENGINE_LOCK_V1.md`.
- Menemukan implementasi awal editor di `apps/admin/src/editor/` dan consumer artikel di `apps/admin/src/pages/ArticleManager.tsx`.
- Menetapkan arah lanjut: editor tetap sebagai Platform Service, halaman artikel tetap sebagai Product Consumer, dan ekstensi tetap melalui registry/editor SDK.
- Mulai peningkatan UI editor fase workspace/canvas: shell metadata, workspace tabs, canvas width, focus mode, zen mode, dan inspector.
- Mengubah `ArticleManager.tsx` untuk menambahkan tab `Write`, `Preview`, `History`, `SEO`, metadata versi/save, kontrol width canvas, focus mode, dan zen mode.
- Mengubah CSS editor layout/canvas untuk mendukung mode fokus, mode zen, panel history/SEO, responsive toolbar canvas, dan width `Narrow/Default/Wide/Full`.
- Verifikasi: `pnpm --filter @modern-cms/admin build` berhasil. Vite memberi warning chunk besar, bukan error build.
- Saat menjalankan `pnpm --filter @modern-cms/admin test:editor`, ditemukan guard lama pada media node selection. Diperbaiki di `MediaNodeView.tsx` dan `imageNodeSelection.ts` agar alignment/selection tetap target exact node via `NodeSelection`.
- Verifikasi akhir: `pnpm --filter @modern-cms/admin test:editor` berhasil dan `pnpm --filter @modern-cms/admin build` berhasil.

## 2026-06-07 - Publishing Workspace Follow-up

- Mengonfirmasi arah lanjutan: fokus pada block editor UX, bukan menambah toolbar formatting.
- Memperluas `EditorContext` dan `EditorProvider` agar selection state menyimpan `activeBlockNode` dan `activeBlockPos`, sehingga inspector dapat hidup saat cursor berada di heading/paragraf.
- Menambahkan tab `Outline` di `InspectorHost` dan membuat daftar heading yang bisa diklik untuk jump ke heading.
- Menambahkan active block settings untuk paragraph/heading, termasuk kontrol `P` dan `H1`-`H6`.
- Menambahkan slash command `/` di `ArticleManager.tsx` untuk insert Paragraph, Heading 1-3, Quote, Code Block, Divider, dan Image.
- Menambahkan affordance `+ Add block` di bawah editor canvas untuk memulai insert block dari akhir dokumen.
- Mengubah status autosave menjadi lebih eksplisit: `Unsaved changes`, `Saving...`, `Last saved ...`, dan `Autosave failed`.
- Mengganti label tab `Preview` menjadi `Editor Preview` agar berbeda dari rencana `Website Preview` berbasis Theme System.
- Verifikasi: `pnpm --filter @modern-cms/admin test:editor` berhasil.
- Verifikasi: `pnpm --filter @modern-cms/admin build` berhasil. Vite masih memberi warning chunk besar, bukan error.

## 2026-06-07 - Block Object UX Correction

- Menerima arahan bahwa tahap sekarang bukan menambah fitur editor, melainkan membuat block terlihat, terasa, dan dapat dikonfigurasi sebagai objek kontekstual.
- Menghapus affordance `+ Add block` permanen yang membuat editor terasa seperti form builder.
- Menambahkan hover block handle di canvas: tombol `+` untuk insert block dan grip visual untuk menandai block sebagai entitas.
- Mengubah slash/insert menu agar memakai anchor dinamis dari cursor atau block handle, sehingga menu muncul dekat konteks visual, bukan di atas editor.
- Menambahkan highlight halus pada top-level block saat hover/focus untuk memperjelas batas objek block tanpa mengubah schema dokumen.
- Mengubah inspector paragraph/heading dari panel teknis `P/H1/H2...` menjadi konfigurasi block dengan section `Transform`, `Style`, `Spacing`, dan `Advanced`.
- Verifikasi: `pnpm --filter @modern-cms/admin test:editor` berhasil.
- Verifikasi: `pnpm --filter @modern-cms/admin build` berhasil. Vite masih memberi warning chunk besar, bukan error.

## 2026-06-07 - Slash Menu Floating Stabilization

- Menerapkan stabilization pass pertama dari audit UX editor khusus untuk slash/block insert menu.
- Memindahkan `SlashCommandMenu` ke React portal (`document.body`) agar tidak terpotong oleh overflow editor/card.
- Mengubah posisi menu dari wrapper-relative menjadi viewport coordinates berbasis `editor.view.coordsAtPos(selection.from)`.
- Menambahkan collision handling dasar: menu membuka ke bawah jika ruang cukup, membuka ke atas jika ruang bawah terbatas, clamp horizontal dalam viewport, dan max-height dengan internal scroll.
- Menambahkan outside click handling untuk menutup menu tanpa mengubah serialized editor content.
- Menjaga behavior insert tetap memakai range selection asli, tanpa mengubah schema, registry, SDK, node definitions, media model, backend, atau menambah block baru.
- Verifikasi: `pnpm --filter @modern-cms/admin test:editor` berhasil.
- Verifikasi: `pnpm --filter @modern-cms/admin build` berhasil. Vite masih memberi warning chunk besar, bukan error.
- Verifikasi Playwright manual: login, buka `/posts/new`, ketik `/` dekat atas editor, menu muncul dekat caret dan tidak clipped; ketik `/` setelah konten panjang/dekat bawah viewport, menu membuka ke atas (`slash-command-menu--up`) dan tidak clipped; insert Heading/Quote berhasil; serialized `.ProseMirror` HTML tidak mengandung markup menu; tidak ada console error setelah login.

## 2026-06-07 - Selected Block Persistence

- Menerapkan perbaikan UX terbatas untuk dua bug terverifikasi: block handle hover-only dan inspector hilang saat inspector diklik.
- Menambahkan state `selectedBlockNode` dan `selectedBlockPos` di `EditorContext`/`EditorProvider`, terpisah dari `activeBlockNode` dan hover state.
- Mengubah `InspectorHost` agar mengikuti selected block persistent, bukan `editor focus`.
- Menambahkan `selectedBlock` lokal di canvas editor untuk menjaga block handle tetap terlihat setelah block dipilih, meski mouse keluar dari block.
- Hover tetap dipakai sebagai visual hint/fallback, sedangkan selected block menjadi source of truth untuk handle.
- Tidak mengubah Slash Menu, Editor Registry, Plugin SDK, schema, node definitions, media model, backend, atau serialized editor content.
- Verifikasi: `pnpm --filter @modern-cms/admin test:editor` berhasil.
- Verifikasi: `pnpm --filter @modern-cms/admin build` berhasil. Vite masih memberi warning chunk besar, bukan error.
- Verifikasi Playwright manual: klik paragraph membuat handle terlihat; mouse keluar dari block handle tetap terlihat; klik control inspector tidak menutup inspector; klik paragraph B memindahkan handle; klik image mengubah inspector ke `Image Settings`; tidak ada console error setelah login.

## 2026-06-07 - Editor Content Integrity Fixes

- Menerapkan perbaikan terbatas untuk integritas konten editor: handle sebagai editor chrome, Enter/paragraf sebagai block terpisah, insert berdasarkan selection asli, dan slash trigger dibersihkan.
- Mengubah posisi block handle di `ArticleManager.tsx` agar ditempatkan di gutter kiri canvas, di luar batas konten block, tanpa mengonsumsi lebar artikel.
- Mengubah `openInsertMenuFromBlock` agar tidak lagi menulis karakter `/` sementara ke dokumen; menu insert dari handle sekarang memakai selection kosong tersimpan.
- Memperkuat `applySlashCommand` agar snapshot menu dipakai secara eksplisit, slash trigger range dihapus sebelum insert, lalu selection dipulihkan ke posisi range tersebut.
- Menambahkan jalur insert block khusus untuk menu dari handle agar Paragraph/Heading/Quote/Code/Divider/Image masuk di posisi selection asli, bukan fallback ke akhir dokumen.
- Membekukan image insert range saat modal dibuka dan menormalkan range block-level untuk image/media supaya insert dari awal/akhir paragraf tetap masuk di lokasi user, bukan append ke dokumen.
- Tidak mengubah Editor Registry, Plugin SDK, schema, node definitions, media model, backend, serialized content format, atau menambah block baru.
- Verifikasi: `pnpm --filter @modern-cms/admin test:editor` berhasil.
- Verifikasi: `pnpm --filter @modern-cms/admin build` berhasil. Vite masih memberi warning chunk besar, bukan error.
- Verifikasi Playwright manual: tiga paragraf dikenali sebagai tiga `<p>` terpisah; insert Heading dari paragraf tengah masuk di posisi tersebut; insert Image dekat awal masuk di awal dokumen; slash command 20 kali tidak meninggalkan `/`; handle berada di luar area konten; tidak ada console error setelah login.

## 2026-06-07 - Contextual Formatting Stabilization

- Menerapkan stabilisasi terbatas untuk command formatting contextual tanpa mengubah registry architecture, Plugin SDK, schema, backend, media model, atau menambah block baru.
- Menambahkan helper command di `EditorProvider.tsx` untuk membedakan inline mark typing-mode vs selected-range: Bold, Italic, dan Strike sekarang memakai stored marks eksplisit saat selection kosong.
- Menangani edge case dokumen kosong setelah delete: selection khusus/non-empty di-collapse ke cursor valid sebelum stored mark diset, supaya klik Bold tanpa selection membuat teks berikutnya bold, bukan membalik state.
- Menambahkan helper block command untuk membersihkan stored marks setelah transform block seperti Paragraph, Heading, Quote, Code Block, Bullet List, Ordered List, Divider, dan image insert.
- Mengubah Text Style heading dari `toggleHeading` menjadi `setHeading` agar pilihan H1/H2/H3 deterministik dan hanya berlaku pada current/selected block.
- Mengubah `unsetLink` agar memakai `extendMarkRange('link')`, lalu membersihkan stored mark supaya teks setelah link tidak ikut menjadi link.
- Menjaga selection saat user klik toolbar/tab dengan `onMouseDown.preventDefault()` di `ToolbarRibbon.tsx`, dan membuat global outside-click handler tidak mereset selection saat target berada di toolbar, tab header, modal, atau slash menu.
- Verifikasi: `pnpm --filter @modern-cms/admin test:editor` berhasil.
- Verifikasi: `pnpm --filter @modern-cms/admin build` berhasil. Vite masih memberi warning chunk besar, bukan error.
- Verifikasi Playwright di dev server fresh: TEST 1 Bold selected text pass; TEST 2 Bold typing mode pass; TEST 3 Link tidak bocor ke teks baru pass; TEST 4 Inline Code via backtick input rule pass; TEST 5 Code Block hanya block tengah pass; TEST 6 Code Block off hanya block tengah pass; TEST 7 Heading hanya block tengah pass; TEST 8 Quote hanya block tengah pass; TEST 9 Bullet List hanya dua paragraph terpilih pass; TEST 10 tidak ada whole-document formatting transform pass.
