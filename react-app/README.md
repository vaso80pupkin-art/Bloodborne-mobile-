# BB Mobile — React (React Three Fiber)

React-версия игры в разработке. Живёт изолированно: существующая статическая игра
(Three.js r128, корневой `index.html` + `js/`) не изменяется и продолжает
публиковаться на GitHub Pages как раньше.

## Структура

- `index.html` — вход Vite-приложения
- `src/main.jsx`, `src/App.jsx` — монтирование React
- `src/ui/` — интерфейсы на React (HUD, полоски здоровья, меню)
- `src/scenes/` — 3D-сцена и канвас (React Three Fiber + drei)
- `public/models/` — .glb/.gltf модели из Blender (Draco/meshopt)

## Команды

```bash
npm install
npm run dev      # dev-сервер Vite
npm run build    # production-сборка в dist/
npm run preview  # локальный просмотр сборки
```

## План

1. Атмосфера: туман, ночное небо, брусчатка, мерцающие фонари ✅ (стартовая сцена)
2. Пост-обработка: Bloom, цветокоррекция, Vignette ✅ (@react-three/postprocessing)
3. Персонаж-охотник: `hunter_rigged.glb` — скелет (15 костей) + клипы Idle / Run / Dodge / Attack, `useAnimations` ✅
   - Скелет и анимации сгенерированы Blender-скриптом: `tools/blender/rig_hunter.py` (Blender 4.x+, headless bpy)
   - Исходник `hunter_light.glb` — meshopt: для Blender его распаковывает `tools/blender/decompress_glb.mjs` (Node, `npm i meshoptimizer`)
4. Боевая система и HUD на React
