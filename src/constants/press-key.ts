import OS from "@/hooks/useOS"

const KEY_UP = {
    S: "s",
    R: "r",
    L: "l",
    Space: " ",
    P: "p",
    Z: "z",
    Delete: !OS.includes("Mac") ? "Delete" : "Backspace",
    Escape: "Escape",
} as const

export type PressKey = (typeof KEY_UP)[keyof typeof KEY_UP]

export default KEY_UP
