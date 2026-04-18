export default function useTimeout(fn: () => void, delay = 1): void {
    const timer = setTimeout(() => {
        fn.call(undefined)
        clearTimeout(timer)
    }, delay)
}
