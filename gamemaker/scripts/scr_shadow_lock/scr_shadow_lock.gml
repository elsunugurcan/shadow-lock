#macro SL_W 720
#macro SL_H 1280
#macro SL_SAVE_FILE "shadowlock.ini"

function sl_init() {
	if (variable_global_exists("sl_ready")) return;
	global.sl_ready = true;
	randomize();
	gpu_set_texfilter(true);

	global.sl_col_bg_top  = make_colour_rgb(24, 18, 43);
	global.sl_col_bg_bot  = make_colour_rgb(57, 28, 74);
	global.sl_col_shadow  = make_colour_rgb(12, 9, 24);
	global.sl_col_text    = make_colour_rgb(245, 240, 255);
	global.sl_col_dim     = make_colour_rgb(150, 135, 185);
	global.sl_col_good    = make_colour_rgb(94, 234, 170);
	global.sl_col_bad     = make_colour_rgb(255, 92, 110);
	global.sl_col_gold    = make_colour_rgb(255, 209, 102);
	global.sl_shape_cols  = [
		make_colour_rgb(255, 140, 105), make_colour_rgb(108, 197, 255),
		make_colour_rgb(255, 209, 102), make_colour_rgb(190, 140, 255),
		make_colour_rgb(120, 230, 190), make_colour_rgb(255, 120, 180)
	];

	// poppins from included files, default font if it fails to load
	global.sl_fonts = [-1, -1, -1];
	global.sl_font_fallback_scale = [4.2, 2.6, 1.7];
	var _sizes = [68, 40, 26];
	if (file_exists("Poppins-Bold.ttf")) {
		for (var i = 0; i < 3; i++) {
			var _f = font_add("Poppins-Bold.ttf", _sizes[i], false, false, 32, 127);
			if (font_exists(_f)) global.sl_fonts[i] = _f;
		}
	}

	// pts are unit size, drawn as a fan from 0,0 so keep the origin inside the shape
	// sym = how many times per turn it lines up
	global.sl_shapes = [
		{ name: "triangle", sym: 3, pts: sl_regular(3, 1.0) },
		{ name: "square",   sym: 4, pts: [-0.8,-0.8, 0.8,-0.8, 0.8,0.8, -0.8,0.8] },
		{ name: "cross",    sym: 4, pts: [-0.32,-1, 0.32,-1, 0.32,-0.32, 1,-0.32, 1,0.32, 0.32,0.32, 0.32,1, -0.32,1, -0.32,0.32, -1,0.32, -1,-0.32, -0.32,-0.32] },
		{ name: "pentagon", sym: 5, pts: sl_regular(5, 0.95) },
		{ name: "arrow",    sym: 1, pts: [0,-1, 0.8,0.1, 0.35,0.1, 0.35,1, -0.35,1, -0.35,0.1, -0.8,0.1] },
		{ name: "house",    sym: 1, pts: [0,-1, 0.85,-0.2, 0.85,0.9, -0.85,0.9, -0.85,-0.2] },
		{ name: "star",     sym: 5, pts: sl_star(5, 1.0, 0.45) },
		{ name: "kite",     sym: 1, pts: [0,-1, 0.62,-0.25, 0,1, -0.62,-0.25] },
		{ name: "chevron",  sym: 1, pts: [0,-1, 0.9,0.8, 0,0.3, -0.9,0.8] }
	];

	// rot deg/s, fall in seconds, tol in degrees
	global.sl_levels = [
		{ title: "WARM UP",     shapes: 3, rot:  90, fall: 4.2, tol: 18, need: 6,  hint: true,  sock_rot: 0,   pulse: 0,    flip: false },
		{ title: "ONE WAY",     shapes: 6, rot: 130, fall: 3.6, tol: 15, need: 8,  hint: false, sock_rot: 0,   pulse: 0,    flip: true  },
		{ title: "MOVING DARK", shapes: 8, rot: 150, fall: 3.3, tol: 14, need: 10, hint: false, sock_rot: -35, pulse: 0,    flip: true  },
		{ title: "HEARTBEAT",   shapes: 9, rot: 180, fall: 3.5, tol: 13, need: 12, hint: false, sock_rot: 25,  pulse: 0.55, flip: true  }
	];

	global.sl_circle = sl_regular(90, 1.0);
	global.sl_heart = [];
	for (var i = 0; i < 28; i++) {
		var _a = i * 360 / 28;
		var _hx = 16 * power(dsin(_a), 3);
		var _hy = -(13 * dcos(_a) - 5 * dcos(2 * _a) - 2 * dcos(3 * _a) - dcos(4 * _a));
		array_push(global.sl_heart, _hx / 17, (_hy - 2) / 17);
	}

	// textures live in included files, game still runs flat if one is missing
	global.sl_tex_glow = sl_load_tex("tex_glow.png", 64, 64);
	global.sl_tex_mat = sl_load_tex("tex_mat.png", 0, 0);
	global.sl_tex_bg = sl_load_tex("tex_bg.png", 0, 0);
	global.sl_tex_haze = sl_load_tex("tex_haze.png", 0, 0);
	global.sl_tex_vig = sl_load_tex("tex_vignette.png", 0, 0);
	global.sl_tex_grain = sl_load_tex("tex_grain.png", 0, 0);

	global.sl_fade = 1;
	global.sl_fade_out = false;
	global.sl_next_room = -1;

	var _amb = audio_play_sound(snd_ambient, 0, true);
	audio_sound_gain(_amb, 0.4, 0);

	global.sl_score = 0;
	global.sl_level_reached = 1;
	global.sl_won = false;
	global.sl_new_best = false;
	ini_open(SL_SAVE_FILE);
	global.sl_best = ini_read_real("save", "best", 0);
	ini_close();
}

function sl_load_tex(_file, _ox, _oy) {
	if (!file_exists(_file)) return -1;
	return sprite_add(_file, 1, false, true, _ox, _oy);
}

function sl_save_best() {
	ini_open(SL_SAVE_FILE);
	ini_write_real("save", "best", global.sl_best);
	ini_close();
}

function sl_regular(_n, _r) {
	var _a = [];
	for (var i = 0; i < _n; i++) {
		var _ang = -90 + i * 360 / _n;
		array_push(_a, dcos(_ang) * _r, dsin(_ang) * _r);
	}
	return _a;
}

function sl_star(_n, _r1, _r2) {
	var _a = [];
	for (var i = 0; i < _n * 2; i++) {
		var _ang = -90 + i * 180 / _n;
		var _r = (i mod 2 == 0) ? _r1 : _r2;
		array_push(_a, dcos(_ang) * _r, dsin(_ang) * _r);
	}
	return _a;
}

function sl_angle_err(_a, _b, _sym) {
	var _period = 360 / _sym;
	var _d = (_a - _b) mod _period;
	if (_d < 0) _d += _period;
	if (_d > _period * 0.5) _d = _period - _d;
	return _d;
}

function sl_ease_back(_x) {
	_x = clamp(_x, 0, 1);
	return 1 + 2.70158 * power(_x - 1, 3) + 1.70158 * power(_x - 1, 2);
}

function sl_ease_bounce(_x) {
	_x = clamp(_x, 0, 1);
	if (_x < 1 / 2.75) return 7.5625 * _x * _x;
	if (_x < 2 / 2.75) { _x -= 1.5 / 2.75; return 7.5625 * _x * _x + 0.75; }
	if (_x < 2.5 / 2.75) { _x -= 2.25 / 2.75; return 7.5625 * _x * _x + 0.9375; }
	_x -= 2.625 / 2.75;
	return 7.5625 * _x * _x + 0.984375;
}

// rotate, then squash in screen space. returns flat [x,y,...] in room coords
function sl_xform(_pts, _cx, _cy, _scale, _ang, _sx, _sy) {
	var _c = dcos(_ang), _s = dsin(_ang);
	var _n = array_length(_pts);
	var _out = array_create(_n);
	for (var i = 0; i < _n; i += 2) {
		var _px = _pts[i] * _scale, _py = _pts[i + 1] * _scale;
		_out[i] = _cx + (_px * _c - _py * _s) * _sx;
		_out[i + 1] = _cy + (_px * _s + _py * _c) * _sy;
	}
	return _out;
}

// flat fill, used for ghosts / shadows
function sl_draw_shape(_pts, _cx, _cy, _scale, _ang, _col, _alpha, _sx = 1, _sy = 1) {
	var _p = sl_xform(_pts, _cx, _cy, _scale, _ang, _sx, _sy);
	var _n = array_length(_p);
	draw_primitive_begin(pr_trianglefan);
	draw_vertex_colour(_cx, _cy, _col, _alpha);
	for (var i = 0; i <= _n; i += 2) {
		var _k = i mod _n;
		draw_vertex_colour(_p[_k], _p[_k + 1], _col, _alpha);
	}
	draw_primitive_end();
}

function sl_draw_shape_outline(_pts, _cx, _cy, _scale, _ang, _col, _alpha, _width, _sx = 1, _sy = 1) {
	var _p = sl_xform(_pts, _cx, _cy, _scale, _ang, _sx, _sy);
	var _n = array_length(_p);
	draw_set_colour(_col);
	draw_set_alpha(_alpha);
	for (var i = 0; i < _n; i += 2) {
		var _m = (i + 2) mod _n;
		draw_line_width(_p[i], _p[i + 1], _p[_m], _p[_m + 1], _width);
		draw_circle(_p[i], _p[i + 1], _width * 0.5, false);
	}
	draw_set_alpha(1);
}

// edge band between the outline and a slightly smaller copy, shaded by which way the edge faces.
// light comes from top left. _inv flips it so the shape reads as a hole instead of a raised piece
function sl_draw_bevel(_p, _cx, _cy, _inset, _strength, _inv) {
	var _n = array_length(_p);
	var _lx = -0.45, _ly = -0.89;
	draw_primitive_begin(pr_trianglelist);
	for (var i = 0; i < _n; i += 2) {
		var _m = (i + 2) mod _n;
		var _ax = _p[i], _ay = _p[i + 1], _bx = _p[_m], _by = _p[_m + 1];
		var _dx = _bx - _ax, _dy = _by - _ay;
		var _len = max(0.001, point_distance(0, 0, _dx, _dy));
		var _lit = (_dy / _len) * _lx + (-_dx / _len) * _ly;
		if (_inv) _lit = -_lit;
		var _col = (_lit > 0) ? c_white : c_black;
		var _al = abs(_lit) * _strength * ((_lit > 0) ? 0.75 : 0.6);
		var _iax = _cx + (_ax - _cx) * _inset, _iay = _cy + (_ay - _cy) * _inset;
		var _ibx = _cx + (_bx - _cx) * _inset, _iby = _cy + (_by - _cy) * _inset;
		draw_vertex_colour(_ax, _ay, _col, _al);
		draw_vertex_colour(_bx, _by, _col, _al);
		draw_vertex_colour(_ibx, _iby, _col, 0);
		draw_vertex_colour(_ax, _ay, _col, _al);
		draw_vertex_colour(_ibx, _iby, _col, 0);
		draw_vertex_colour(_iax, _iay, _col, 0);
	}
	draw_primitive_end();
}

// the proper textured piece
function sl_draw_piece(_pts, _cx, _cy, _scale, _ang, _col, _alpha, _sx = 1, _sy = 1) {
	var _p = sl_xform(_pts, _cx, _cy, _scale, _ang, _sx, _sy);
	var _n = array_length(_p);
	var _cc = merge_colour(_col, c_white, 0.3);
	var _ce = merge_colour(_col, c_black, 0.1);

	if (global.sl_tex_mat != -1) {
		var _uv = sprite_get_uvs(global.sl_tex_mat, 0);
		var _uw = _uv[2] - _uv[0], _vh = _uv[3] - _uv[1];
		draw_primitive_begin_texture(pr_trianglefan, sprite_get_texture(global.sl_tex_mat, 0));
		draw_vertex_texture_colour(_cx, _cy, _uv[0] + 0.5 * _uw, _uv[1] + 0.5 * _vh, _cc, _alpha);
		for (var i = 0; i <= _n; i += 2) {
			var _k = i mod _n;
			draw_vertex_texture_colour(_p[_k], _p[_k + 1], _uv[0] + (0.5 + _pts[_k] * 0.47) * _uw, _uv[1] + (0.5 + _pts[_k + 1] * 0.47) * _vh, _ce, _alpha);
		}
		draw_primitive_end();
	} else {
		draw_primitive_begin(pr_trianglefan);
		draw_vertex_colour(_cx, _cy, _cc, _alpha);
		for (var i = 0; i <= _n; i += 2) {
			var _k = i mod _n;
			draw_vertex_colour(_p[_k], _p[_k + 1], _ce, _alpha);
		}
		draw_primitive_end();
	}
	sl_draw_bevel(_p, _cx, _cy, 0.8, _alpha, false);
}

// carved slot in the plate
function sl_draw_socket(_pts, _cx, _cy, _scale, _ang, _ring_col, _ring_alpha, _glow) {
	var _p = sl_xform(_pts, _cx, _cy, _scale, _ang, 1, 1);
	var _n = array_length(_p);
	draw_primitive_begin(pr_trianglefan);
	draw_vertex_colour(_cx, _cy, global.sl_col_shadow, 0.97);
	for (var i = 0; i <= _n; i += 2) {
		var _k = i mod _n;
		draw_vertex_colour(_p[_k], _p[_k + 1], c_black, 0.97);
	}
	draw_primitive_end();
	sl_draw_bevel(_p, _cx, _cy, 0.84, 1, true);

	if (_glow > 0) {
		gpu_set_blendmode(bm_add);
		sl_draw_shape_outline(_pts, _cx, _cy, _scale, _ang, _ring_col, 0.18 * _glow, 22);
		sl_draw_shape_outline(_pts, _cx, _cy, _scale, _ang, _ring_col, 0.3 * _glow, 12);
		gpu_set_blendmode(bm_normal);
	}
	sl_draw_shape_outline(_pts, _cx, _cy, _scale, _ang, _ring_col, _ring_alpha, 4);
}

function sl_draw_ring(_x, _y, _r, _w, _col, _alpha) {
	draw_primitive_begin(pr_trianglestrip);
	for (var i = 0; i <= 40; i++) {
		var _a = i * 9;
		var _c = dcos(_a), _s = dsin(_a);
		draw_vertex_colour(_x + _c * (_r + _w), _y + _s * (_r + _w), _col, 0);
		draw_vertex_colour(_x + _c * _r, _y + _s * _r, _col, _alpha);
	}
	draw_primitive_end();
	draw_primitive_begin(pr_trianglestrip);
	for (var i = 0; i <= 40; i++) {
		var _a = i * 9;
		var _c = dcos(_a), _s = dsin(_a);
		draw_vertex_colour(_x + _c * _r, _y + _s * _r, _col, _alpha);
		draw_vertex_colour(_x + _c * max(0, _r - _w), _y + _s * max(0, _r - _w), _col, 0);
	}
	draw_primitive_end();
}

function sl_glow(_x, _y, _scale, _col, _alpha, _xs = 1, _ys = 1) {
	if (global.sl_tex_glow != -1) {
		draw_sprite_ext(global.sl_tex_glow, 0, _x, _y, _scale * _xs, _scale * _ys, 0, _col, _alpha);
	} else {
		draw_set_colour(_col);
		draw_set_alpha(_alpha * 0.3);
		draw_circle(_x, _y, 40 * _scale, false);
		draw_set_alpha(1);
	}
}

function sl_draw_rot_rect(_x, _y, _w, _h, _ang, _col, _alpha) {
	var _c = dcos(_ang), _s = dsin(_ang);
	var _hx = _w * 0.5, _hy = _h * 0.5;
	draw_primitive_begin(pr_trianglestrip);
	draw_vertex_colour(_x + (-_hx * _c + _hy * _s), _y + (-_hx * _s - _hy * _c), _col, _alpha);
	draw_vertex_colour(_x + (_hx * _c + _hy * _s), _y + (_hx * _s - _hy * _c), _col, _alpha);
	draw_vertex_colour(_x + (-_hx * _c - _hy * _s), _y + (-_hx * _s + _hy * _c), _col, _alpha);
	draw_vertex_colour(_x + (_hx * _c - _hy * _s), _y + (_hx * _s + _hy * _c), _col, _alpha);
	draw_primitive_end();
}

// size: 0 big, 1 mid, 2 small
function sl_text(_x, _y, _str, _size, _col, _alpha, _halign = fa_center, _scale = 1) {
	var _f = global.sl_fonts[_size];
	var _sc = _scale;
	if (_f == -1) _sc *= global.sl_font_fallback_scale[_size];
	draw_set_font(_f);
	draw_set_halign(_halign);
	draw_set_valign(fa_middle);
	var _off = (_size == 2) ? 2 : 4;
	draw_set_colour(c_black);
	draw_set_alpha(_alpha * 0.4);
	draw_text_transformed(_x + _off * 0.5, _y + _off, _str, _sc, _sc, 0);
	draw_set_colour(_col);
	draw_set_alpha(_alpha);
	draw_text_transformed(_x, _y, _str, _sc, _sc, 0);
	draw_set_alpha(1);
	draw_set_halign(fa_left);
	draw_set_valign(fa_top);
}

// letters drop in one after another, then bob a little
function sl_text_drop(_x, _y, _str, _size, _col, _t, _scale) {
	var _f = global.sl_fonts[_size];
	var _sc = _scale;
	if (_f == -1) _sc *= global.sl_font_fallback_scale[_size];
	draw_set_font(_f);
	var _len = string_length(_str);
	var _total = 0;
	for (var i = 1; i <= _len; i++) _total += string_width(string_char_at(_str, i)) * _sc;
	var _px = _x - _total * 0.5;
	for (var i = 1; i <= _len; i++) {
		var _ch = string_char_at(_str, i);
		var _w = string_width(_ch) * _sc;
		var _lt = _t - (i - 1) * 0.07;
		if (_lt > 0) {
			var _k = sl_ease_bounce(_lt / 0.7);
			var _yy = _y - (1 - _k) * 420 + dsin(_t * 120 + i * 50) * 4 * clamp(_lt - 0.7, 0, 1);
			sl_text(_px + _w * 0.5, _yy, _ch, _size, _col, clamp(_lt * 6, 0, 1), fa_center, _scale);
		}
		_px += _w;
	}
}

function sl_draw_background(_t) {
	draw_set_alpha(1);
	if (global.sl_tex_bg != -1) {
		draw_sprite_stretched_ext(global.sl_tex_bg, 0, -10, -10 + dsin(_t * 8) * 8, SL_W + 20, SL_H + 20, c_white, 1);
	} else {
		draw_rectangle_colour(0, 0, SL_W, SL_H, global.sl_col_bg_top, global.sl_col_bg_top, global.sl_col_bg_bot, global.sl_col_bg_bot, false);
	}

	gpu_set_blendmode(bm_add);
	if (global.sl_tex_haze != -1) {
		draw_sprite_tiled_ext(global.sl_tex_haze, 0, _t * 9, _t * -5, 4, 4, c_white, 0.10);
		draw_sprite_tiled_ext(global.sl_tex_haze, 0, _t * -14 + 300, _t * 4 + 200, 2.6, 2.6, global.sl_col_gold, 0.04);
	}
	// stars
	for (var i = 0; i < 34; i++) {
		var _sx = (i * 197.3 + 40) mod SL_W;
		var _sy = (i * i * 31.7 + i * 89) mod (SL_H * 0.8);
		var _tw = 0.35 + 0.35 * sin(_t * (1.2 + (i mod 4) * 0.5) + i * 2.1);
		sl_glow(_sx, _sy, 0.10 + (i mod 3) * 0.05, c_white, _tw);
	}
	// dust floating up
	for (var i = 0; i < 18; i++) {
		var _px = (i * 173.3 + dsin(_t * 14 + i * 40) * 40) mod SL_W;
		var _py = SL_H - ((_t * (16 + (i mod 5) * 7) + i * 211.7) mod (SL_H + 60));
		sl_glow(_px, _py, 0.18 + (i mod 4) * 0.08, global.sl_col_dim, 0.22);
	}
	gpu_set_blendmode(bm_normal);
}

// vignette + grain + room fade, draw this last
function sl_draw_overlay(_t) {
	if (global.sl_tex_vig != -1) draw_sprite_stretched_ext(global.sl_tex_vig, 0, 0, 0, SL_W, SL_H, c_white, 1);
	if (global.sl_tex_grain != -1) {
		var _j = floor(_t * 14);
		draw_sprite_tiled_ext(global.sl_tex_grain, 0, (_j * 37) mod 128, (_j * 91) mod 128, 2, 2, c_white, 0.045);
	}
	if (global.sl_fade > 0) {
		draw_set_colour(c_black);
		draw_set_alpha(global.sl_fade);
		draw_rectangle(-20, -20, SL_W + 20, SL_H + 20, false);
		draw_set_alpha(1);
	}
}

function sl_goto(_room) {
	if (global.sl_fade_out) return;
	global.sl_fade_out = true;
	global.sl_next_room = _room;
}

function sl_fade_step(_dt) {
	if (global.sl_fade_out) {
		global.sl_fade += _dt * 4.5;
		if (global.sl_fade >= 1) {
			global.sl_fade = 1;
			global.sl_fade_out = false;
			room_goto(global.sl_next_room);
		}
	} else {
		global.sl_fade = max(0, global.sl_fade - _dt * 3);
	}
}

function sl_button(_cx, _cy, _w, _h, _label, _col, _enabled, _t) {
	var _x1 = _cx - _w * 0.5, _y1 = _cy - _h * 0.5, _x2 = _cx + _w * 0.5, _y2 = _cy + _h * 0.5;
	var _over = point_in_rectangle(mouse_x, mouse_y, _x1, _y1, _x2, _y2);
	var _down = _over && mouse_check_button(mb_left);
	var _off = _down ? 6 : 0;
	var _r = _h * 0.5;

	draw_set_alpha(0.4);
	draw_set_colour(c_black);
	draw_roundrect_ext(_x1 + 4, _y1 + 16, _x2 + 4, _y2 + 16, _r, _r, false);
	draw_set_alpha(1);
	// side
	draw_set_colour(merge_colour(_col, c_black, 0.45));
	draw_roundrect_ext(_x1, _y1 + 10, _x2, _y2 + 10, _r, _r, false);
	// face
	draw_set_colour(_col);
	draw_roundrect_ext(_x1, _y1 + _off, _x2, _y2 + _off, _r, _r, false);
	draw_set_colour(c_white);
	draw_set_alpha(0.28);
	draw_roundrect_ext(_x1 + 14, _y1 + _off + 8, _x2 - 14, _y1 + _off + _h * 0.45, _r * 0.6, _r * 0.6, false);
	draw_set_alpha(1);

	// shine sweeping across now and then
	var _sw = (_t mod 2.6) / 0.6;
	if (_sw < 1) {
		var _sx = lerp(_x1 + _r, _x2 - _r, _sw);
		gpu_set_blendmode(bm_add);
		sl_glow(_sx, _cy + _off, 1, c_white, 0.35 * sin(_sw * pi), 0.7, _h / 128);
		gpu_set_blendmode(bm_normal);
	}

	sl_text(_cx, _cy + _off + 2, _label, 1, global.sl_col_shadow, 1, fa_center, clamp(_h / 112, 0, 1.05));
	return _enabled && !global.sl_fade_out && _over && mouse_check_button_released(mb_left);
}

function sl_play(_snd, _pitch = 1, _gain = 1) {
	var _id = audio_play_sound(_snd, 1, false);
	audio_sound_pitch(_id, _pitch);
	audio_sound_gain(_id, _gain, 0);
	return _id;
}
