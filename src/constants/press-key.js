import OS from "@/hooks/useOS.js"

const KEY_UP = {
    S: "s",
    R: "r",
    L: "l",
    Space: " ",
    P: "p",
    Z: "z",
    Delete: !OS.includes("Mac") ? "Delete" : "Backspace",
    Escape: "Escape",
}

export default KEY_UP
