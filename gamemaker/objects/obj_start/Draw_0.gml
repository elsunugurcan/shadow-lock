sl_draw_background(t);

for (var i = 0; i < array_length(floaters); i++) {
	var f = floaters[i];
	sl_draw_shape(f.shape.pts, f.x, f.y, f.sc, f.a, f.col, 0.07);
	sl_draw_shape_outline(f.shape.pts, f.x, f.y, f.sc, f.a, f.col, 0.12, 2);
}

sl_text_drop(SL_W * 0.5, 235, "SHADOW", 0, global.sl_col_text, t - 0.2, 1.3);
sl_text_drop(SL_W * 0.5, 335, "LOCK", 0, global.sl_col_gold, t - 0.7, 1.3);

var cx = SL_W * 0.5, cy = 650;
var cyc = t mod 3.2;
var locked = (cyc >= 2.2);
var intro = sl_ease_back((t - 0.4) / 0.5);

gpu_set_blendmode(bm_add);
draw_primitive_begin(pr_trianglestrip);
draw_vertex_colour(cx - 60, -20, c_white, 0.09);
draw_vertex_colour(cx + 60, -20, c_white, 0.09);
draw_vertex_colour(cx - 290, cy + 120, c_white, 0);
draw_vertex_colour(cx + 290, cy + 120, c_white, 0);
draw_primitive_end();
gpu_set_blendmode(bm_normal);

if (t > 0.4) {
	sl_glow(cx + 12, cy + 36, 6.6 * intro, c_black, 0.55);
	sl_draw_piece(global.sl_circle, cx, cy + 14, 200 * intro, 0, make_colour_rgb(30, 22, 52), 1);
	sl_draw_piece(global.sl_circle, cx, cy, 200 * intro, t * 3, make_colour_rgb(74, 58, 112), 1);
	sl_draw_socket(demo_shape.pts, cx, cy, 128 * intro, 36, locked ? global.sl_col_good : global.sl_col_dim, locked ? 1 : 0.55, lock_fx);

	var lift = locked ? 0 : 150 * power(1 - cyc / 2.2, 2);
	var q = lock_fx * lock_fx;
	var sx = 1 + 0.14 * q * cos(lock_fx * 14), sy = 1 - 0.14 * q * cos(lock_fx * 14);
	if (!locked) sl_draw_shape(demo_shape.pts, cx + 8 + lift * 0.12, cy + 12 + lift * 0.2, 120 * intro, demo_ang, c_black, 0.3);
	gpu_set_blendmode(bm_add);
	sl_glow(cx, cy - lift, 4.4, global.sl_shape_cols[2], 0.2 + 0.3 * lock_fx);
	gpu_set_blendmode(bm_normal);
	sl_draw_piece(demo_shape.pts, cx, cy - lift, 120 * intro, demo_ang, global.sl_shape_cols[2], 1, sx, sy);
	if (lock_fx > 0) {
		gpu_set_blendmode(bm_add);
		sl_draw_ring(cx, cy, 120 + (1 - lock_fx) * 260, 30 * lock_fx + 4, global.sl_col_gold, 0.7 * q);
		gpu_set_blendmode(bm_normal);
	}
}

var ta = clamp((t - 1.2) * 2, 0, 1);
sl_text(SL_W * 0.5, 925, "Tap when the shape", 2, global.sl_col_text, 0.8 * ta);
sl_text(SL_W * 0.5, 965, "lines up with its shadow", 2, global.sl_col_text, 0.8 * ta);

var bk = sl_ease_back((t - 1.0) / 0.5);
if (t > 1.0) {
	var pulse = bk * (1 + 0.03 * sin(t * 4));
	if (sl_button(SL_W * 0.5, 1080, 380 * pulse, 116 * pulse, "PLAY", global.sl_col_gold, t > 1.3, t)) go = true;
}

if (global.sl_best > 0) sl_text(SL_W * 0.5, 1200, "BEST  " + string(global.sl_best), 2, global.sl_col_text, 0.9 * ta);

sl_draw_overlay(t);
