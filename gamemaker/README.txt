Shadow Lock
-----------
Open ShadowLock.yyp in GameMaker (2024.x or newer, it will convert if needed).

Rooms: rm_start -> rm_game -> rm_over
All tuning (speeds, tolerance, matches per level, shapes) is in scripts/scr_shadow_lock, inside sl_init().
Pieces are polygons drawn in code with a material texture on top. Textures (background, material, glow,
vignette, grain) and the font are in Included Files and get loaded at startup, so you can swap any png
without touching code. Sounds are in the Sounds folder.
Font: Poppins Bold (OFL).

Android: portrait only, package is com.yourcompany.shadowlock - change it in Game Options > Android before export.
