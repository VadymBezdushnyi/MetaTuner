var PitchTracker = {};

Module['onRuntimeInitialized'] = () => {
    PitchTracker.init = Module.cwrap("init_pitch_tracker", null, ["number"]);
    PitchTracker.get_pitch = Module.cwrap("get_pitch", "number", ["number", "number"]);
}
