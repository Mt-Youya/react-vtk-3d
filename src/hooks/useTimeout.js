export default function useTimeout(fn, delay = 1) {
    const timer = setTimeout(() => {
        fn.call(this)
        clearTimeout(timer)
    }, delay)
}
