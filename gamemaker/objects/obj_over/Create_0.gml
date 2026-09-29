sl_init();
t = 0;
shown = 0;
action = 0;
tick_timer = 0;
bits = [];
celebrate = (global.sl_won || global.sl_new_best);
if (global.sl_won) sl_play(snd_level);

// confetti when there is something to celebrate, otherwise broken bits falling
add_bit = function(_y) {
	var _c = celebrate ? global.sl_shape_cols[irandom(array_length(global.sl_shape_cols) - 1)] : global.sl_col_dim;
	array_push(bits, {
		x: random(SL_W), y: _y, vx: random_range(-40, 40), vy: random_range(140, 320),
		a: random(360), va: random_range(-300, 300), w: random_range(10, 22), h: random_range(8, 16),
		ph: random(6), col: _c
	});
}
repeat (celebrate ? 46 : 14) add_bit(random_range(-SL_H, 0));
