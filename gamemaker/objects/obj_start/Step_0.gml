var dt = min(delta_time / 1000000, 1 / 30);
sl_fade_step(dt);
t += dt;
lock_fx = max(0, lock_fx - dt * 2);

for (var i = 0; i < array_length(floaters); i++) {
	var f = floaters[i];
	f.y -= f.vy * dt;
	f.a += f.va * dt;
	if (f.y < -120) {
		f.y = SL_H + 120;
		f.x = random(SL_W);
	}
}

// demo piece spins down and clicks into its shadow
var cyc = t mod 3.2;
var locked = (cyc >= 2.2);
if (!locked) demo_ang = (1 - power(1 - cyc / 2.2, 3)) * 360 + 36;
else demo_ang = 36;
if (locked && !was_locked) lock_fx = 1;
was_locked = locked;

if (keyboard_check_pressed(vk_backspace) || keyboard_check_pressed(vk_escape)) game_end();

if (go) {
	go = false;
	sl_play(snd_click);
	sl_goto(rm_game);
}
