sl_draw_background(t);

for (var i = 0; i < array_length(bits); i++) {
	var b = bits[i];
	// fake a flip by squeezing the height
	var flip = celebrate ? abs(sin(t * 5 + b.ph)) : 1;
	sl_draw_rot_rect(b.x, b.y, b.w, b.h * max(0.15, flip), b.a, b.col, celebrate ? 0.9 : 0.35);
}

if (global.sl_won) {
	sl_text_drop(SL_W * 0.5, 230, "ALL CLEAR!", 0, global.sl_col_gold, t - 0.1, 1);
	sl_text(SL_W * 0.5, 315, "every shadow locked", 2, global.sl_col_text, clamp(t - 0.8, 0, 1) * 0.8);
} else {
	sl_text_drop(SL_W * 0.5, 230, "GAME OVER", 0, global.sl_col_bad, t - 0.1, 1);
	sl_text(SL_W * 0.5, 315, "reached level " + string(global.sl_level_reached), 2, global.sl_col_text, clamp(t - 0.8, 0, 1) * 0.8);
}

var sh = global.sl_shapes[global.sl_won ? 6 : 4];
var k = sl_ease_back((t - 0.3) / 0.5);
if (t > 0.3) {
	var a = global.sl_won ? t * 40 : 160 + dsin(t * 90) * 8;
	var bob = dsin(t * 70) * 10;
	var pc = global.sl_won ? global.sl_col_gold : make_colour_rgb(120, 110, 150);
	sl_glow(SL_W * 0.5 + 10, 640, 3.4 - bob * 0.02, c_black, 0.4);
	if (global.sl_won) {
		gpu_set_blendmode(bm_add);
		sl_glow(SL_W * 0.5, 510 + bob, 6 + 0.4 * sin(t * 3), global.sl_col_gold, 0.35);
		gpu_set_blendmode(bm_normal);
	}
	sl_draw_piece(sh.pts, SL_W * 0.5, 510 + bob, 112 * k, a, pc, 1);
	if (!global.sl_won) {
		// crack
		draw_set_colour(global.sl_col_shadow);
		draw_set_alpha(0.8);
		var cx = SL_W * 0.5, cy = 510 + bob;
		draw_line_width(cx - 30, cy - 50, cx + 4, cy - 8, 4);
		draw_line_width(cx + 4, cy - 8, cx - 16, cy + 20, 4);
		draw_line_width(cx - 16, cy + 20, cx + 22, cy + 60, 4);
		draw_set_alpha(1);
	}
}

var ka = clamp((t - 0.5) * 3, 0, 1);
sl_text(SL_W * 0.5, 725, "SCORE", 2, global.sl_col_dim, ka);
var done = (shown >= global.sl_score);
sl_text(SL_W * 0.5, 800, string(floor(shown)), 0, global.sl_col_text, ka, fa_center, done ? 1 + 0.08 * max(0, sin(t * 3)) * (global.sl_new_best ? 1 : 0) : 1.08);
if (global.sl_new_best) {
	if (done) sl_text(SL_W * 0.5, 885, "NEW BEST!", 1, global.sl_col_gold, 0.7 + 0.3 * sin(t * 6), fa_center, 1 + 0.05 * sin(t * 6));
} else {
	sl_text(SL_W * 0.5, 885, "BEST  " + string(global.sl_best), 2, global.sl_col_text, 0.9 * ka);
}

var b1 = sl_ease_back((t - 0.9) / 0.4), b2 = sl_ease_back((t - 1.05) / 0.4);
if (t > 0.9 && sl_button(SL_W * 0.5, 1020, 390 * b1, 108 * b1, "RETRY", global.sl_col_gold, t > 1.2, t)) action = 1;
if (t > 1.05 && sl_button(SL_W * 0.5, 1155, 390 * b2, 108 * b2, "MENU", global.sl_col_good, t > 1.2, t + 1.3)) action = 2;

sl_draw_overlay(t);
