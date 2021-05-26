var audioCtx;
var canvas;
var canvasCtx;
var analyser;
var samples;
var estimations;
var pitch_detector;
var samples_ptr;

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


window.onload = function() {
    navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: {ideal: 1, min: 1},
            echoCancelation: false,
            noiseSuppression: false,
            audioGainControl: false,
        }
    , video: false }).then(handleSuccess);

    canvas = document.getElementById("visualizer");
    canvasCtx = canvas.getContext("2d");
}

const handleSuccess = function(stream) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    
    const source = audioCtx.createMediaStreamSource(stream);
    
    // pass it into the audio context
    const audioElement = document.querySelector('audio');
    // const track = audioCtx.createMediaElementSource(audioElement);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;

    samples = new Float32Array(analyser.fftSize);
    pitch_detector = new PitchDetector(audioCtx.sampleRate);

    console.log(audioCtx.sampleRate);
    source.connect(analyser);
    // track.connect(analyser);
    // analyser.connect(audioCtx.destination);
    estimations = new Float32Array();

    
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


    // cancelAnimationFrame(id);
    updateCanvas(pitch_estimation);
}


const max_visible_estimations = 100;
var ring_buffer = new Float32Array(max_visible_estimations);
var ring_size = 0;
var ring_pos = 0;

const notes = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
function GetNearestNoteAndCents(freq){
    const A4 = 440.0;
    const nearest_freq = A4 * (Math.pow(2, (Math.round(12 * Math.log2(freq / A4)) / 12)));   
    
    const note_distance = Math.round(12 * Math.log2(freq / A4));
    // console.log(nearest_freq, note_distance)
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
    canvasCtx.fillStyle = "rgb(230, 230, 250)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";

    canvasCtx.beginPath(); 
    

    const plot_width = canvas.width * 0.7;
    var last_value_was_NaN = true;
    var ring_buffer_offset = Math.max(max_visible_estimations - ring_size, 0);

    var sliceWidth = plot_width * 1.0 / max_visible_estimations;
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
        
        var x = (ring_buffer_offset + i) * sliceWidth;
        var freq_value = (ring_buffer[pos] - min_freq) / (max_freq - min_freq);
        var y = (1 - freq_value) * canvas.height;

        
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
    // draw note
    const [note, cents] = GetNearestNoteAndCents(pitch_estimation);
    
    const note_X = (plot_width + canvas.width) / 2;
    const note_Y = canvas.height / 2; 
    
    canvasCtx.font = '48px serif';
    canvasCtx.strokeText(note, note_X, note_Y);
    
    canvasCtx.font = '20px serif';
    canvasCtx.strokeText(cents, note_X, note_Y + 40);

    // draw note box
    const freq_y = (pitch_estimation - min_freq) / (max_freq - min_freq); 
    const color = (1 - Math.abs(cents / 50)) * 120;
    canvasCtx.fillStyle = 'hsl('+color+', 80%, 50%)';
    const note_box_width = 20;
    const note_box_height = -(cents / 50) * canvas.height/2;

    canvasCtx.fillRect(plot_width, canvas.height/2, note_box_width, note_box_height);
}