export default function useAsyncTimeout(fn, delay = 1) {
    return new Promise(resolve => {
        const timer = setTimeout(() => {
            resolve(fn.call(this))
            clearTimeout(timer)
        }, delay)
    })
}
