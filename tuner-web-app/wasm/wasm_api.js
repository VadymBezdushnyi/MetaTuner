var init_pitch_tracker = Module.cwrap("init_pitch_tracker", null, ["number"]);
var get_pitch = Module.cwrap("get_pitch", "number", ["number", "number"]);
