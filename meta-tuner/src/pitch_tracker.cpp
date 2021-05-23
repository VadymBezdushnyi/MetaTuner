#include <cmath>
#include <algorithm>
#include <cstdio>

extern "C" {

struct pitch_tracker_t{
    uint32_t sample_rate = 0;
} pitch_tracker;

void init_pitch_tracker(uint32_t sample_rate) {
    pitch_tracker.sample_rate = sample_rate;
}

double get_pitch(float* samples, uint32_t sample_size) {
    // printf("C++: %g, %g %u\n", samples[0], samples[1], sample_size);
    // printf("Rate: %d, buffer size: %d\n", pitch_tracker.sample_rate, sample_size);
    // return 440.5 + samples[0] + samples[1];
    
    
    const double BEST_RES_THRESHOLD = 1.0; // 0.8
    const uint32_t N = sample_size; 

    uint32_t best_k = -1;
    double best_res = 0;
    

    double rms = 0;
    for(uint32_t i = 0; i < N; i++) {
        rms += (double)samples[i] * samples[i];
    }
    rms = sqrt(rms / N);
    const double dbfs = 20 * log10(rms);
    if(dbfs < -40) {
        return -1;
    } 

    const uint32_t maxK = std::min(sample_size, uint32_t(700));
    for(uint32_t k = 60; k < 700; k++) {
        double sum = 0;
        for(uint32_t i = 0; i < N - k; i++) {
            sum += (double)samples[i] * samples[i + k];
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
        return -1;
    }
    return pitch_tracker.sample_rate / best_k;
}

}