emcc ..\..\meta-tuner\src\pitch_tracker.cpp^
 -o pitch_tracker.js^
 -O3^
 -s WASM=1^
 -s EXPORTED_FUNCTIONS="['_malloc', '_free', '_init_pitch_tracker', '_get_pitch']"^
 -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']"^
 -s ALLOW_MEMORY_GROWTH=1^
 -s ABORTING_MALLOC=0