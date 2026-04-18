export default function useIdleCallback(func: () => void): void {
    requestIdleCallback((idle) => {
        if (idle.timeRemaining()) {
            func.call(undefined)
        }
    })
}
