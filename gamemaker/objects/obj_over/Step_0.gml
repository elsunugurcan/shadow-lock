var dt = min(delta_time / 1000000, 1 / 30);
sl_fade_step(dt);
t += dt;

if (t > 0.6 && shown < global.sl_score) {
	shown = min(global.sl_score, shown + max(1, global.sl_score) * dt / 0.9);
	tick_timer -= dt;
	if (tick_timer <= 0) {
		tick_timer = 0.06;
		sl_play(snd_click, 1.2 + 0.6 * shown / max(1, global.sl_score), 0.35);
	}
}

for (var i = 0; i < array_length(bits); i++) {
	var b = bits[i];
	b.x += (b.vx + sin(t * 2 + b.ph) * 60) * dt;
	b.y += b.vy * dt;
	b.a += b.va * dt;
	if (b.y > SL_H + 40) {
		b.y = -40;
		b.x = random(SL_W);
	}
}

if (keyboard_check_pressed(vk_backspace) || keyboard_check_pressed(vk_escape)) action = 2;

if (action != 0) {
	sl_play(snd_click);
	sl_goto(action == 1 ? rm_game : rm_start);
	action = 0;
}
