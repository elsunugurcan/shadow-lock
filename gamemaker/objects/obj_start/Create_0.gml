sl_init();
t = 0;
demo_ang = 0;
demo_shape = global.sl_shapes[6];
lock_fx = 0;
was_locked = false;
go = false;

// slow shapes drifting in the back
floaters = [];
for (var i = 0; i < 7; i++) {
	array_push(floaters, {
		shape: global.sl_shapes[i mod array_length(global.sl_shapes)],
		x: random(SL_W), y: random(SL_H), vy: random_range(12, 34),
		a: random(360), va: random_range(-25, 25), sc: random_range(36, 80),
		col: global.sl_shape_cols[i mod array_length(global.sl_shape_cols)]
	});
}
