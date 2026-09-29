sl_init();

level = 1;
cfg = global.sl_levels[0];
hp = 3;
points = 0;
disp_points = 0;
score_pop = 0;
combo = 0;
matched = 0;
bar_fill = 0;
hp_anim = [0, 0, 0];

sock_x = SL_W * 0.5;
sock_y = 960;
start_y = 260;
size = 118;

state = "banner";
timer = 1.6;
banner_len = 1.6;
t = 0;
shake = 0;
flash = 0;
flash_col = c_white;
freeze = 0;
squash = 0;
spawn_t = 1;
rays = 0;
plate_kick = 0;

shape = global.sl_shapes[0];
col = global.sl_shape_cols[0];
ang = 0;
sock_ang = 0;
dir = 1;
prog = 0;
sy = start_y;
slam_from = 0;
slam_t = 0;
err = 0;
hit = false;
perfect = false;
last_shape = -1;
shattered = false;

parts = [];
shards = [];
rings = [];
popups = [];
ghosts = [];
ghost_timer = 0;

spawn = function() {
	var _i = irandom(cfg.shapes - 1);
	if (_i == last_shape) _i = (_i + 1 + irandom(cfg.shapes - 2)) mod cfg.shapes;
	last_shape = _i;
	shape = global.sl_shapes[_i];
	col = global.sl_shape_cols[irandom(array_length(global.sl_shape_cols) - 1)];
	ang = random(360);
	sock_ang = irandom(11) * 30;
	dir = (cfg.flip && irandom(1) == 0) ? -1 : 1;
	prog = 0;
	sy = start_y;
	hit = false;
	shattered = false;
	spawn_t = 0;
	squash = 0;
	ghosts = [];
	state = "fall";
	sl_play(snd_whoosh, random_range(1.3, 1.5), 0.25);
}

sparks = function(_x, _y, _col, _count, _spd) {
	repeat (_count) {
		var _a = random(360), _v = random_range(_spd * 0.25, _spd);
		array_push(parts, { kind: 0, x: _x, y: _y, vx: dcos(_a) * _v, vy: dsin(_a) * _v - 120, life: random_range(0.45, 1.0), col: _col, r: random_range(0.25, 0.6) });
	}
}

dust = function(_x, _y, _count) {
	repeat (_count) {
		var _side = choose(-1, 1);
		array_push(parts, { kind: 1, x: _x + _side * random_range(40, size), y: _y + random_range(-20, 40), vx: _side * random_range(120, 380), vy: random_range(-90, 30), life: random_range(0.5, 0.9), col: global.sl_col_dim, r: random_range(0.5, 1.1) });
	}
}

ring = function(_x, _y, _col, _speed, _w) {
	array_push(rings, { x: _x, y: _y, r: size * 0.7, spd: _speed, w: _w, life: 1, col: _col });
}

// break the piece into its fan triangles and throw them
shatter = function() {
	var _p = sl_xform(shape.pts, sock_x, sy, size, ang, 1, 1);
	var _n = array_length(_p);
	for (var i = 0; i < _n; i += 2) {
		var _m = (i + 2) mod _n;
		var _mx = (sock_x + _p[i] + _p[_m]) / 3, _my = (sy + _p[i + 1] + _p[_m + 1]) / 3;
		var _d = point_direction(sock_x, sy, _mx, _my);
		var _v = random_range(260, 620);
		array_push(shards, {
			x: _mx, y: _my,
			ax: sock_x - _mx, ay: sy - _my, bx: _p[i] - _mx, by: _p[i + 1] - _my, cx: _p[_m] - _mx, cy: _p[_m + 1] - _my,
			vx: lengthdir_x(_v, _d), vy: lengthdir_y(_v, _d) - 260,
			rot: 0, vrot: random_range(-540, 540), life: random_range(0.9, 1.4), col: col
		});
	}
	shattered = true;
}

popup = function(_str, _col) {
	array_push(popups, { str: _str, y: sock_y - 250, life: 1.0, col: _col });
}
