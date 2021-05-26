class PitchTrackerNode extends AudioWorkletNode {
    constructor() {
        super();
    }

    process(inputList, outputList, parameters) {
        /* using the inputs (or not, as needed), write the output
           into each of the outputs */
    
        return true;
    }
}

registerProcessor("PitchTrackerNode", MyAudioProcessor);