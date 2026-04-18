export default function useAsyncTimeout<T>(fn: () => T, delay = 1): Promise<T> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve(fn.call(undefined))
            clearTimeout(timer)
        }, delay)
    })
}
