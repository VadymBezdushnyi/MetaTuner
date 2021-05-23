#include <stdio.h>

extern "C" {

int fib(int n){
    if(n == 0 || n == 1)
        return 1;
    else
        return fib(n - 1) + fib(n - 2);
}

int main() {
    printf("Hello World\n");
    printf("Fib(5) = %d\n", fib(5));
}

}