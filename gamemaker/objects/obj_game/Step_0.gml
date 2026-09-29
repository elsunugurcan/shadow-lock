var rdt = min(delta_time / 1000000, 1 / 30);
sl_fade_step(rdt);
t += rdt;

// hit stop
var dt = rdt;
if (freeze > 0) {
	freeze -= rdt;
	dt = rdt * 0.05;
}

shake = max(0, shake - rdt * 45);
flash = max(0, flash - rdt * 2.5);
squash = max(0, squash - dt * 4);
rays = max(0, rays - dt * 1.6);
plate_kick = max(0, plate_kick - dt * 5);
score_pop = max(0, score_pop - rdt * 4);
spawn_t = min(1, spawn_t + dt / 0.3);
disp_points = lerp(disp_points, points, 1 - power(0.0005, rdt));
if (abs(points - disp_points) < 0.6) disp_points = points;
bar_fill = lerp(bar_fill, matched / cfg.need, 1 - power(0.001, rdt));
for (var i = 0; i < 3; i++) hp_anim[i] = max(0, hp_anim[i] - rdt * 2.2);

for (var i = array_length(parts) - 1; i >= 0; i--) {
	var p = parts[i];
	p.life -= dt;
	if (p.kind == 0) {
		p.vy += 1100 * dt;
		p.vx *= power(0.25, dt);
	} else {
		p.vx *= power(0.02, dt);
		p.vy *= power(0.05, dt);
		p.r += dt * 1.4;
	}
	p.x += p.vx * dt;
	p.y += p.vy * dt;
	if (p.life <= 0) array_delete(parts, i, 1);
}
for (var i = array_length(shards) - 1; i >= 0; i--) {
	var s = shards[i];
	s.life -= dt;
	s.vy += 1700 * dt;
	s.x += s.vx * dt;
	s.y += s.vy * dt;
	s.rot += s.vrot * dt;
	if (s.life <= 0 || s.y > SL_H + 200) array_delete(shards, i, 1);
}
for (var i = array_length(rings) - 1; i >= 0; i--) {
	var rg = rings[i];
	rg.life -= dt * 1.9;
	rg.r += rg.spd * dt * (0.4 + rg.life);
	if (rg.life <= 0) array_delete(rings, i, 1);
}
for (var i = array_length(popups) - 1; i >= 0; i--) {
	var pp = popups[i];
	pp.life -= dt;
	pp.y -= 80 * dt * pp.life;
	if (pp.life <= 0) array_delete(popups, i, 1);
}
for (var i = array_length(ghosts) - 1; i >= 0; i--) {
	ghosts[i].life -= dt * 4.5;
	if (ghosts[i].life <= 0) array_delete(ghosts, i, 1);
}

if (keyboard_check_pressed(vk_backspace) || keyboard_check_pressed(vk_escape)) sl_goto(rm_start);
if (global.sl_fade_out) exit;

var tapped = mouse_check_button_pressed(mb_left);

switch (state) {
	case "banner":
		timer -= dt;
		if (timer <= 0 || (tapped && timer < banner_len - 0.6)) spawn();
		break;

	case "fall":
		var spd = cfg.rot * dir;
		if (cfg.pulse > 0) spd *= 1 + cfg.pulse * sin(t * 3.2);
		ang += spd * dt;
		sock_ang += cfg.sock_rot * dt;
		prog += dt / cfg.fall;
		sy = lerp(start_y, sock_y, prog * prog * 0.35 + prog * 0.65);

		ghost_timer -= dt;
		if (ghost_timer <= 0) {
			ghost_timer = 0.045;
			array_push(ghosts, { y: sy, a: ang, life: 1 });
		}

		if (tapped) {
			err = sl_angle_err(ang, sock_ang, shape.sym);
			hit = (err <= cfg.tol);
			slam_from = sy;
			slam_t = 0;
			state = "slam";
			sl_play(snd_whoosh, 1, 0.5);
		} else if (prog >= 1) {
			err = 999;
			hit = false;
			slam_from = sock_y;
			slam_t = 1;
			state = "slam";
		}
		break;

	case "slam":
		slam_t += dt / 0.13;
		sy = lerp(slam_from, sock_y, min(1, slam_t * slam_t));
		array_push(ghosts, { y: sy, a: ang, life: 0.8 });
		if (slam_t >= 1) {
			sy = sock_y;
			squash = 1;
			plate_kick = 1;
			dust(sock_x, sock_y + size * 0.6, hit ? 8 : 14);
			if (hit) {
				var period = 360 / shape.sym;
				ang = sock_ang + round((ang - sock_ang) / period) * period;
				perfect = (err <= cfg.tol * 0.35);
				combo++;
				var mult = 1 + min(4, combo div 3);
				var gain = (perfect ? 25 : 10) * mult;
				points += gain;
				score_pop = 1;
				matched++;
				sparks(sock_x, sock_y, col, perfect ? 34 : 16, perfect ? 900 : 600);
				if (perfect) sparks(sock_x, sock_y, global.sl_col_gold, 18, 700);
				ring(sock_x, sock_y, perfect ? global.sl_col_gold : col, perfect ? 900 : 650, perfect ? 46 : 30);
				if (perfect) {
					ring(sock_x, sock_y, c_white, 520, 22);
					rays = 1;
				}
				popup((perfect ? "PERFECT +" : "+") + string(gain), perfect ? global.sl_col_gold : global.sl_col_good);
				if (mult > 1) popup("x" + string(mult), global.sl_col_text);
				sl_play(perfect ? snd_perfect : snd_lock, 1 + min(combo, 10) * 0.03);
				flash = perfect ? 0.3 : 0.12;
				flash_col = c_white;
				shake = perfect ? 12 : 6;
				freeze = perfect ? 0.09 : 0.05;
				timer = 0.6;
			} else {
				hp--;
				hp_anim[hp] = 1;
				combo = 0;
				shatter();
				sparks(sock_x, sock_y, global.sl_col_bad, 20, 700);
				ring(sock_x, sock_y, global.sl_col_bad, 700, 34);
				popup(err > 900 ? "TOO LATE" : "MISS", global.sl_col_bad);
				sl_play(snd_shatter, random_range(0.9, 1.1));
				sl_play(snd_fail, 1, 0.7);
				flash = 0.45;
				flash_col = global.sl_col_bad;
				shake = 20;
				freeze = 0.12;
				timer = (hp <= 0) ? 1.3 : 0.85;
			}
			state = "result";
		}
		break;

	case "result":
		timer -= dt;
		if (timer <= 0) {
			if (hp <= 0 || (matched >= cfg.need && level >= array_length(global.sl_levels))) {
				global.sl_won = (hp > 0);
				global.sl_score = points + (global.sl_won ? hp * 100 : 0);
				global.sl_level_reached = level;
				global.sl_new_best = (global.sl_score > global.sl_best);
				if (global.sl_new_best) {
					global.sl_best = global.sl_score;
					sl_save_best();
				}
				sl_goto(rm_over);
			} else if (matched >= cfg.need) {
				level++;
				cfg = global.sl_levels[level - 1];
				matched = 0;
				bar_fill = 0;
				last_shape = -1;
				if (hp < 3) {
					hp_anim[hp] = 1;
					hp++;
				}
				sl_play(snd_level);
				state = "banner";
				banner_len = 2.0;
				timer = banner_len;
			} else {
				spawn();
			}
		}
		break;
}
