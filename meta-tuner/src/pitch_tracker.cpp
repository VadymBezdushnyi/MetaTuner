#include <cmath>
#include <algorithm>
#include <cstdio>

extern "C" {

const int kMaxFreq = 800;
double auto_corr[kMaxFreq+1];

struct pitch_tracker_t{
    uint32_t sample_rate = 0;
} pitch_tracker;

void init_pitch_tracker(uint32_t sample_rate) {
    pitch_tracker.sample_rate = sample_rate;
}

double interpolate_parabola(double a, double b, double c) {
  const double den = a - 2 * b + c;
  if (den == 0) return 0;
  return (a - c) / 2 / den;
}

double get_pitch(float* samples, uint32_t sample_size) {   
    const double BEST_RES_THRESHOLD = 0.95;
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

    for(uint32_t k = 60; k < kMaxFreq; k++) {
        double sum = 0;
        for(uint32_t i = 0; i < N - k; i++) {
            sum += (double)samples[i] * samples[i + k];
        }
        sum /= N;
        auto_corr[k] = sum;

        if(sum > best_res) {
            best_k = k;
            best_res = sum;
        }
    }

    if(best_k == -1) {
        return -1;
    }

    double adjusted_value = best_k + interpolate_parabola(auto_corr[best_k-1], auto_corr[best_k], auto_corr[best_k+1]);

    return pitch_tracker.sample_rate / adjusted_value;
}

}