sl_draw_background(t);

var playing = (state != "banner");
var pop = sl_ease_back(spawn_t);

// light falling on the plate
gpu_set_blendmode(bm_add);
draw_primitive_begin(pr_trianglestrip);
draw_vertex_colour(sock_x - 70, -20, c_white, 0.10);
draw_vertex_colour(sock_x + 70, -20, c_white, 0.10);
draw_vertex_colour(sock_x - 300, sock_y + 120, c_white, 0);
draw_vertex_colour(sock_x + 300, sock_y + 120, c_white, 0);
draw_primitive_end();
sl_glow(sock_x, -10, 5, c_white, 0.16 + 0.03 * sin(t * 2.3));
gpu_set_blendmode(bm_normal);

var shx = random_range(-shake, shake), shy = random_range(-shake, shake);
matrix_set(matrix_world, matrix_build(shx, shy, 0, 0, 0, 0, 1, 1, 1));

// plate
var py = sock_y + plate_kick * plate_kick * 10;
sl_glow(sock_x + 14, py + 40, 7.6, c_black, 0.55);
sl_draw_piece(global.sl_circle, sock_x, py + 16, 232, 0, make_colour_rgb(30, 22, 52), 1);
sl_draw_piece(global.sl_circle, sock_x, py, 232, t * 3, make_colour_rgb(74, 58, 112), 1);
sl_draw_shape_outline(global.sl_circle, sock_x, py, 196, 0, c_black, 0.25, 3);
sl_draw_shape_outline(global.sl_circle, sock_x, py + 2, 196, 0, c_white, 0.08, 2);
for (var i = 0; i < 12; i++) {
	var ta = i * 30;
	var tx = sock_x + dcos(ta) * 212, ty = py + dsin(ta) * 212;
	draw_set_colour(c_black);
	draw_set_alpha(0.35);
	draw_circle(tx, ty, 5, false);
	draw_set_colour(c_white);
	draw_set_alpha(0.18);
	draw_circle(tx - 1, ty - 1.5, 2, false);
}
draw_set_alpha(1);

if (playing) {
	var aligned = (state == "fall") && cfg.hint && (sl_angle_err(ang, sock_ang, shape.sym) <= cfg.tol);
	var ring_col = global.sl_col_dim, ring_a = 0.55, glow = 0;
	if (aligned) { ring_col = global.sl_col_good; ring_a = 1; glow = 0.7 + 0.3 * sin(t * 18); }
	if (state == "result") {
		ring_col = hit ? global.sl_col_good : global.sl_col_bad;
		ring_a = 1;
		glow = clamp(timer * 2, 0, 1);
	}
	sl_draw_socket(shape.pts, sock_x, py, size * 1.07 * pop, sock_ang, ring_col, ring_a, glow);

	// drop guide
	draw_set_colour(global.sl_col_dim);
	for (var gy = start_y + 40; gy < sock_y - 250; gy += 40) {
		draw_set_alpha(0.10 + 0.12 * (0.5 + 0.5 * sin(t * 5 - gy * 0.02)));
		draw_line_width(sock_x, gy, sock_x, gy + 16, 3);
	}
	draw_set_alpha(1);

	if (!shattered) {
		var landed = (state == "result");
		var near = clamp((sy - start_y) / (sock_y - start_y), 0, 1);

		// shadow the piece throws on the plate, tightens as it gets close
		if (!landed) sl_draw_shape(shape.pts, sock_x + 26 * (1 - near) + 6, py + 40 * (1 - near) + 8, size * (1.25 - 0.2 * near), ang, c_black, 0.10 + 0.25 * near * near);

		for (var i = 0; i < array_length(ghosts); i++) {
			var g = ghosts[i];
			sl_draw_shape(shape.pts, sock_x, g.y, size * pop, g.a, col, 0.10 * g.life);
		}

		var sx = 1, sy2 = 1, sc = size * pop;
		if (state == "slam") { sx = 0.9; sy2 = 1.14; }
		if (landed) {
			var q = squash * squash;
			var wv = cos(squash * 14);
			sx = 1 + 0.16 * q * wv;
			sy2 = 1 - 0.16 * q * wv;
			sc = size * (1 + 0.05 * q);
		}

		gpu_set_blendmode(bm_add);
		sl_glow(sock_x, sy, 4.6 + 0.3 * sin(t * 6), col, landed ? 0.35 * clamp(timer * 3, 0, 1) : 0.22);
		gpu_set_blendmode(bm_normal);

		if (!landed) sl_draw_shape(shape.pts, sock_x + 8, sy + 14, sc, ang, c_black, 0.28, sx, sy2);
		sl_draw_piece(shape.pts, sock_x, sy, sc, ang, col, 1, sx, sy2);

		if (landed && hit) {
			// white pop that fades off the piece
			var w = clamp((timer - 0.35) / 0.25, 0, 1);
			if (w > 0) {
				gpu_set_blendmode(bm_add);
				sl_draw_shape(shape.pts, sock_x, sy, sc, ang, c_white, 0.7 * w, sx, sy2);
				gpu_set_blendmode(bm_normal);
			}
		}
	}
}

gpu_set_blendmode(bm_add);
if (rays > 0) {
	draw_primitive_begin(pr_trianglelist);
	for (var i = 0; i < 12; i++) {
		var ra = i * 30 + t * 40;
		var rl = 520 * (1.2 - rays * 0.4);
		var wdt = 7 + (i mod 3) * 4;
		draw_vertex_colour(sock_x, sock_y, global.sl_col_gold, 0.55 * rays);
		draw_vertex_colour(sock_x + dcos(ra - wdt) * rl, sock_y + dsin(ra - wdt) * rl, global.sl_col_gold, 0);
		draw_vertex_colour(sock_x + dcos(ra + wdt) * rl, sock_y + dsin(ra + wdt) * rl, global.sl_col_gold, 0);
	}
	draw_primitive_end();
}
for (var i = 0; i < array_length(rings); i++) {
	var rg = rings[i];
	sl_draw_ring(rg.x, rg.y, rg.r, rg.w * rg.life + 4, rg.col, 0.75 * rg.life * rg.life);
}
gpu_set_blendmode(bm_normal);

for (var i = 0; i < array_length(parts); i++) {
	var p = parts[i];
	if (p.kind == 1) sl_glow(p.x, p.y, p.r, p.col, 0.30 * clamp(p.life * 2, 0, 1));
}
gpu_set_blendmode(bm_add);
for (var i = 0; i < array_length(parts); i++) {
	var p = parts[i];
	if (p.kind == 0) {
		var k = clamp(p.life * 2, 0, 1);
		sl_glow(p.x, p.y, p.r * k, p.col, 0.9);
		sl_glow(p.x, p.y, p.r * k * 0.35, c_white, 0.9);
	}
}
gpu_set_blendmode(bm_normal);

for (var i = 0; i < array_length(shards); i++) {
	var s = shards[i];
	var c = dcos(s.rot), sn = dsin(s.rot);
	var al = clamp(s.life * 2, 0, 1);
	var x1 = s.x + s.ax * c - s.ay * sn, y1 = s.y + s.ax * sn + s.ay * c;
	var x2 = s.x + s.bx * c - s.by * sn, y2 = s.y + s.bx * sn + s.by * c;
	var x3 = s.x + s.cx * c - s.cy * sn, y3 = s.y + s.cx * sn + s.cy * c;
	draw_primitive_begin(pr_trianglelist);
	draw_vertex_colour(x1, y1, merge_colour(s.col, c_white, 0.35), al);
	draw_vertex_colour(x2, y2, s.col, al);
	draw_vertex_colour(x3, y3, merge_colour(s.col, c_black, 0.3), al);
	draw_primitive_end();
	draw_set_colour(c_white);
	draw_set_alpha(al * 0.5);
	draw_line_width(x2, y2, x3, y3, 2);
	draw_set_alpha(1);
}

for (var i = 0; i < array_length(popups); i++) {
	var pp = popups[i];
	var pk = sl_ease_back(clamp((1 - pp.life) * 5, 0, 1));
	sl_text(sock_x, pp.y - i * 60, pp.str, 1, pp.col, clamp(pp.life * 3, 0, 1), fa_center, 0.5 + 0.5 * pk);
}

matrix_set(matrix_world, matrix_build_identity());

// hud
sl_text(SL_W * 0.5, 100, string(round(disp_points)), 0, global.sl_col_text, 1, fa_center, 1 + 0.3 * score_pop * score_pop);
sl_text(36, 64, "LEVEL " + string(level), 2, global.sl_col_dim, 1, fa_left);
for (var i = 0; i < 3; i++) {
	var hx = SL_W - 52 - i * 52, hy = 64;
	var on = (i < hp);
	var an = hp_anim[i];
	var beat = (on && hp == 1) ? 0.12 * max(0, sin(t * 9)) : 0;
	sl_draw_shape(global.sl_heart, hx + 2, hy + 4, 22, 0, c_black, 0.35);
	if (on) {
		sl_draw_piece(global.sl_heart, hx, hy, 22 * (1 + beat + 0.5 * an), 0, global.sl_col_bad, 1);
	} else {
		sl_draw_shape(global.sl_heart, hx, hy, 22, 0, global.sl_col_shadow, 0.8);
		if (an > 0) {
			gpu_set_blendmode(bm_add);
			sl_draw_shape(global.sl_heart, hx, hy, 22 * (1 + (1 - an) * 1.6), 0, global.sl_col_bad, an * 0.8);
			gpu_set_blendmode(bm_normal);
		}
	}
}

var bw = 440, bx = (SL_W - bw) * 0.5, by = 168, bh = 18;
draw_set_colour(c_black);
draw_set_alpha(0.5);
draw_roundrect_ext(bx - 3, by - 3, bx + bw + 3, by + bh + 3, bh + 6, bh + 6, false);
draw_set_alpha(1);
var fillw = bw * clamp(bar_fill, 0, 1);
if (fillw > bh) {
	draw_set_colour(global.sl_col_good);
	draw_roundrect_ext(bx, by, bx + fillw, by + bh, bh, bh, false);
	draw_set_colour(c_white);
	draw_set_alpha(0.35);
	draw_roundrect_ext(bx + 5, by + 3, bx + fillw - 5, by + 8, 5, 5, false);
	draw_set_alpha(1);
	gpu_set_blendmode(bm_add);
	sl_glow(bx + fillw - 6, by + bh * 0.5, 0.7, global.sl_col_good, 0.6 + 0.2 * sin(t * 7));
	gpu_set_blendmode(bm_normal);
}
for (var i = 1; i < cfg.need; i++) {
	draw_set_colour(c_black);
	draw_set_alpha(0.3);
	draw_line_width(bx + bw * i / cfg.need, by + 2, bx + bw * i / cfg.need, by + bh - 2, 2);
}
draw_set_alpha(1);

if (combo >= 3) {
	var cw = 1 + 0.06 * sin(t * 12);
	sl_text(SL_W * 0.5, 228, "COMBO " + string(combo), 2, global.sl_col_gold, 1, fa_center, cw);
}

if (state == "banner") {
	var e = banner_len - timer;
	var kin = sl_ease_back(e / 0.45);
	var kout = clamp(timer / 0.25, 0, 1);
	var slide = (1 - kin) * -500;
	draw_set_colour(c_black);
	draw_set_alpha(0.35 * kout * clamp(e * 4, 0, 1));
	draw_rectangle(0, 440, SL_W, 760, false);
	draw_set_alpha(1);
	sl_text(SL_W * 0.5 + slide, 520, "LEVEL " + string(level), 0, global.sl_col_text, kout);
	sl_text(SL_W * 0.5 - slide, 612, cfg.title, 1, global.sl_col_gold, kout);
	var lw = 260 * clamp((e - 0.3) / 0.4, 0, 1);
	draw_set_colour(global.sl_col_gold);
	draw_set_alpha(kout);
	draw_line_width(SL_W * 0.5 - lw, 660, SL_W * 0.5 + lw, 660, 3);
	draw_set_alpha(1);
	var tip = "Tap when the shape matches its shadow";
	if (level == 2) tip = "No more glow. Watch the direction!";
	if (level == 3) tip = "The shadow is turning too";
	if (level == 4) tip = "The spin speeds up and slows down";
	sl_text(SL_W * 0.5, 710, tip, 2, global.sl_col_text, kout * clamp((e - 0.5) * 3, 0, 1));
}

if (flash > 0) {
	draw_set_colour(flash_col);
	draw_set_alpha(flash * 0.6);
	draw_rectangle(0, 0, SL_W, SL_H, false);
	draw_set_alpha(1);
}
if (hp == 1) {
	gpu_set_blendmode(bm_add);
	draw_set_alpha(0.16 + 0.08 * sin(t * 9));
	draw_rectangle_colour(0, SL_H - 260, SL_W, SL_H, c_black, c_black, global.sl_col_bad, global.sl_col_bad, false);
	draw_set_alpha(1);
	gpu_set_blendmode(bm_normal);
}

sl_draw_overlay(t);
