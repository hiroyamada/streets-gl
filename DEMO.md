# Shibuya Kart — demo notes

- **Live URL:** not deployed yet — run locally: `npm ci && npm run build && npm start` → http://localhost:8080 (opens on Shibuya Scramble Crossing). Deploy with the existing `Dockerfile` (Node 19, serves `build/` via http-server on port 8080).
- **Controls:** W/S or ↑/↓ accelerate/brake, A/D or ←/→ steer, hold Space while turning to drift and release for a boost, R reset, C toggles back to the normal streets.gl orbit camera.
- **What works:** drivable kart with chase camera on real 3D Shibuya, 8 glowing Stars at landmarks (Scramble Crossing, Hachiko, 109, Miyashita Park, Stream, Dogenzaka, Center-gai, Yoyogi Park), pickup within 3 m, HUD counter + arrow/distance to the nearest Star, win screen with elapsed time, Space to restart, drift + boost.
- **What's stubbed:** the kart is a colored box (no model), no collision with buildings (you drive through them), no sound, Stars are not snapped to roads.
- **How streets.gl was extended:** a new `KartControlsNavigator` plugs into the existing `ControlsSystem`, a `KartSystem` adds hand-built `ColoredBox` objects to the existing scene graph, and a 30-line `renderKart()` in `GBufferPass` draws them with a new flat-color material whose glow output feeds the existing bloom pass — everything else is untouched upstream streets.gl.
