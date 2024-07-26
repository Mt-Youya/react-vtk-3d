export default function useIdleCallback(func){
    requestIdleCallback(idle => {
        if (idle.timeRemaining()) {
            func.call(this)
        }
    })
}
