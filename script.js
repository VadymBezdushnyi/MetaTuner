var audioCtx;
var canvas;
var canvasCtx;
var analyser;
var samples;
var estimations;
var pitch_detector;
var samples_ptr;

/*
class PitchDetector {
    constructor(sample_rate){
        this.sample_rate = sample_rate;
    }

    process(samples) {
        const BEST_RES_THRESHOLD = 1.0 // 0.8

        var best_k = -1, best_res = 0;
        const N = samples.length; 

        var rms = 0;
        for(var i = 0; i < N; i++) {
            rms += samples[i] * samples[i];
        }
        rms = Math.sqrt(rms / N);
        let dbfs = 20*Math.log10(rms);
        if(dbfs < -40) {
            return NaN;
        } 

        const maxK = Math.min(samples.length, 700);
        for(var k = 60; k < 700; k++) {
            var sum = 0;
            for(var i = 0; i < N - k; i++) {
                sum += samples[i] * samples[i + k];
            }
            sum /= N;

            if(sum > best_res) {
                best_k = k;
                best_res = sum;
            }

            if(best_res > BEST_RES_THRESHOLD){
                break;
            }
        }

        if(best_k == -1) {
            return NaN;
        }
        return this.sample_rate / best_k;
    }
}
*/

window.onload = function() {
    canvas = document.getElementById("visualizer");
    canvasCtx = canvas.getContext("2d");

    navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: {ideal: 1, min: 1},
            echoCancelation: false,
            noiseSuppression: false,
            audioGainControl: false,
        }
    , video: false }).then(handleSuccess).catch(function(err) {
        alert("Please allow to process data from your microphone");
    });    
}

const handleSuccess = function(stream) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    
    const source = audioCtx.createMediaStreamSource(stream);
    
    // const audioElement = document.querySelector('audio');
    // const track = audioCtx.createMediaElementSource(audioElement);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;

    samples = new Float32Array(analyser.fftSize);

    console.log(audioCtx.sampleRate);
    source.connect(analyser);
    // track.connect(analyser);
    // analyser.connect(audioCtx.destination);
    estimations = new Float32Array();

    
    canvas.addEventListener("mousewheel", zoom, false);
    canvas.addEventListener("mousedown", setMouseDown, false);
    canvas.addEventListener("mouseup", setMouseUp, false);
    canvas.addEventListener("mousemove", move, false);

    
    PitchTracker.init(audioCtx.sampleRate);
    samples_ptr = Module._malloc(samples.length * samples.BYTES_PER_ELEMENT);

    draw();

    
};

function draw() {
    var id = requestAnimationFrame(draw);

    analyser.getFloatTimeDomainData(samples);
    
    Module.HEAPF32.set(samples, samples_ptr / samples.BYTES_PER_ELEMENT);
    pitch_estimation = PitchTracker.get_pitch(samples_ptr, samples.length);
    if(pitch_estimation < 0) {
        pitch_estimation = NaN;
    }

    updateCanvas(pitch_estimation);
    
    // cancelAnimationFrame(id);
}


function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }


var DEFAULT_ZOOM = 1.0;
var canvas_scale = DEFAULT_ZOOM;
var mouseDown = false;
var mousePos = [0, 0];
var MAX_ZOOM = 3;
var MIN_ZOOM = 1.0;
var ZOOM_STEP = .1;
var DRAW_POS = [0, 0];
var drawPos = [0, 0];
// var DRAW_POS = [canvas.width/2, canvas.height/2];

function zoom(e) {
    if (e.wheelDelta > 0) {
        zoomIn(e);
    }
    else {
        zoomOut(e);
    }
}

// Zoom in
function zoomIn(e) {
    if (canvas_scale < MAX_ZOOM) {
        var old_zoom = canvas_scale; 
        canvas_scale += ZOOM_STEP;
        
        var mouse = getMousePos(canvas, e);
        // drawPos[1] = mouse.y + (canvas_scale / old_zoom) * (drawPos[1] - mouse.y);
    }
}

// Zoom out
function zoomOut(e) {
    if (canvas_scale > MIN_ZOOM) {
        
        canvas_scale -= ZOOM_STEP;
        var mouse = getMousePos(canvas, e);
        // drawPos[1] = mouse.y + (canvas_scale / old_zoom) * (drawPos[1] - mouse.y);
    }
}

// Reset the zoom
function resetZoom(e) {
    canvas_scale = DEFAULT_ZOOM;
    
}

// Reset the position
function resetPos(e) {
    drawPos = DRAW_POS;
    
}

// Toggle mouse status
function setMouseDown(e) {
    console.log("down");
    mouseDown = true;
    mousePos = [e.x, e.y];
}
function setMouseUp(e) {
    mouseDown = false;
}

// Move
function move(e) {
    if (mouseDown) {
        var dX = 0, dY = 0;
        var delta = [e.x - mousePos[0], e.y - mousePos[1]];
        drawPos = [drawPos[0] + delta[0], drawPos[1] + delta[1]];
        mousePos = [e.x, e.y];
        
    }
}


var max_visible_estimations = 200;
var ring_buffer = new Float32Array(max_visible_estimations);
var ring_size = 0;
var ring_pos = 0;

const notes = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const c_major_notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const c_major = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];

const A4 = 440.0;
const A4_POS = 12 + 12 + 12 + 9;
function GetNearestNoteAndCents(freq){
    const nearest_freq = A4 * (Math.pow(2, (Math.round(12 * Math.log2(freq / A4)) / 12)));   
    
    const note_distance = Math.round(12 * Math.log2(freq / A4));

    const octave = Math.floor((note_distance + 9) / 12 + 4); // octave starts from C
    const note_in_octave = (note_distance % 12 + 12) % 12;
    
    const cents = Math.round(1200 * Math.log2(freq / nearest_freq));
    return [notes[note_in_octave] + octave.toString(), cents];
}    


function updateCanvas(pitch_estimation) {
    if(ring_size !== max_visible_estimations) {
        ring_size++;
    }
    ring_buffer[ring_pos] = pitch_estimation;
    
    // console.log(pitch_estimation);
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
    canvasCtx.fillStyle = "#fffff0";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";


    canvasCtx.fillStyle = "rgb(0, 0, 0)";
    // draw lines
    
    const plot_width = canvas.width * 0.7;
    var note_width = 20 * canvas_scale;
    const notes_names_offset = 32;
    for(let octave = 1; octave <= 7; octave++) {
        for(let note = 0; note < 12; note++) {
            canvasCtx.font = '12px arial';
            const y_pos = canvas.height -note_width*((octave-1)*12 + note) + drawPos[1];
            if(c_major[note]) {
                // canvasCtx.fillText(c_major_notes[note]+octave, 10, y_pos+4);
            } else {
                if(canvas_scale < 1.5 ){
                    continue;
                } 
            }
            canvasCtx.fillText(c_major_notes[note]+octave, 10, y_pos+4);

            canvasCtx.strokeStyle = (note == 0 ? "black" : "#444444")
            canvasCtx.lineWidth = (c_major[note]+ 1) /2;
            canvasCtx.beginPath();
            canvasCtx.moveTo(notes_names_offset, y_pos);
            canvasCtx.lineTo(plot_width, y_pos);
            canvasCtx.stroke();
        }
    } 


    canvasCtx.beginPath(); 
    var last_value_was_NaN = true;
    var ring_buffer_offset = Math.max(max_visible_estimations - ring_size, 0);

    
    var sliceWidth = (plot_width - notes_names_offset) / max_visible_estimations;
    const min_freq = 70.0, max_freq = 700.0;
    for (var i = 0; i < ring_size; i++) {
        var pos = i;
        if(ring_size === max_visible_estimations) {
            pos = (ring_pos + 1 + i) % max_visible_estimations;
        }
        if(isNaN(ring_buffer[pos])) {
            last_value_was_NaN = true;
            continue;
        }
        
        canvasCtx.lineWidth = 2;
        
        var note_width = 20 * canvas_scale;
        var x = notes_names_offset + (ring_buffer_offset + i) * sliceWidth;
        var freq_value = ring_buffer[pos];
        const note_distance = 12 * Math.log2(freq_value / A4) + A4_POS;
        const y_pos = canvas.height - note_width*note_distance + drawPos[1];
            
        var y = y_pos;
        
        if(last_value_was_NaN) {
            canvasCtx.moveTo(x, y);
            last_value_was_NaN = false;
        } else {
            canvasCtx.lineTo(x, y);
        }
    }

    // canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke(); 

    
    
    ring_pos++;
    if(ring_pos == max_visible_estimations) {
        ring_pos = 0;
    }



    if(isNaN(pitch_estimation)) {
        return;
    }


    const std_var_size = 5;
    var last_k_notes = []
    for (var i = ring_size - std_var_size - 1; i < ring_size - 1; i++) {
        var pos = i;
        if(ring_size === max_visible_estimations) {
            pos = (ring_pos + 1 + i) % max_visible_estimations;
        }
        if(isNaN(ring_buffer[pos])) {
            last_k_notes.push(NaN);
        } else {
            const note = 12 * Math.log2(ring_buffer[pos] / A4)
            last_k_notes.push(note); 
        }
    }


    const std_var_threshold = 0.5;
    var std_var = 0;
    const avg = last_k_notes.reduce((a, b) => a + b, 0) / last_k_notes.length;
    for(var i =0; i < last_k_notes.length; i++) {
        std_var += Math.pow(last_k_notes[i] - avg, 2);
    }
    std_var = Math.sqrt(std_var / std_var_size);
    // console.log(std_var);
    if(isNaN(std_var) || std_var > std_var_threshold) {
        return;
    }

    // draw note
    const [note, cents] = GetNearestNoteAndCents(pitch_estimation);

    const note_X = (plot_width + canvas.width) / 2;
    const note_Y = canvas.height / 2; 
    
    
    const radius = 70;

    var gradient = canvasCtx.createLinearGradient(note_X, note_Y - radius, note_X, note_Y + 4*radius);

    
    const good_color = 'hsl(100,96%, 73%)'
    var first_color = good_color;
    var second_color = good_color;

    const distance_to_note = 1 - Math.abs(cents) / 50;
    const bad_color = 'hsl(' + 100 * Math.pow(distance_to_note, 1.3) + ',96%, 73%)'
    if(cents >= 0) {
        first_color = bad_color;
    } else {
        second_color = bad_color;
    }

    gradient.addColorStop(0, first_color);
    gradient.addColorStop(.5, second_color);
    
    canvasCtx.fillStyle = gradient;

    canvasCtx.beginPath();
    canvasCtx.arc(note_X, note_Y, radius, 0, 2*Math.PI, 0);
    canvasCtx.strokeStyle = gradient;
    canvasCtx.lineWidth = 30;
    canvasCtx.stroke();

    // draw note circle
    // canvasCtx.fillStyle = 'hsl('+color+', 80%, 50%)';
    const note_box_width = 20;
    const note_box_height = -(cents / 50) * canvas.height/2;

    // draw note 
    
    canvasCtx.strokeStyle = "#000000";
    canvasCtx.lineWidth = 2;

    canvasCtx.textAlign = "center";
    canvasCtx.font = '48px serif';
    canvasCtx.strokeText(note, note_X, note_Y+10);
    
    canvasCtx.font = '20px serif';
    const cents_str = (cents <= 0 ? cents : "+" + cents);
    canvasCtx.strokeText(cents_str, note_X, note_Y + 40);
}