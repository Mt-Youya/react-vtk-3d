export default (function (){
    const crypto = window.crypto || window.msCrypto || null
    if (crypto) {
        return function randomUUID(){
            return crypto.randomUUID()
        }
    } else {
        return function randomUUID(){
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                const r = (Math.random() * 16) | 0
                const v = c === "x" ? r : (r & 0x3) | 0x8
                return v.toString(16)
            })
        }
    }
})()
