#include <cmath>
#include <algorithm>

struct pitch_tracker_t{
    size_t sample_rate = 0;
} pitch_tracker;

void init_pitch_tracker(size_t sample_rate) {
    pitch_tracker.sample_rate = sample_rate;
}

double get_pitch(float* samples, size_t sample_size) {
    return sample_size + pitch_tracker.sample_rate + 0.5;
    
    /*
    const double BEST_RES_THRESHOLD = 1.0; // 0.8
    const size_t N = sample_size; 

    double best_k = -1, best_res = 0;
    

    double rms = 0;
    for(size_t i = 0; i < N; i++) {
        rms += (double)samples[i] * samples[i];
    }
    rms = sqrt(rms / N);
    const double dbfs = 20 * log10(rms);
    if(dbfs < -40) {
        return -1;
    } 

    const size_t maxK = std::min(sample_size, size_t(700));
    for(size_t k = 60; k < 700; k++) {
        double sum = 0;
        for(size_t i = 0; i < N - k; i++) {
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
    return _sample_rate / best_k;
    */
}
