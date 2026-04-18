const CLICK_KEY = {
    Move: "move",
    Rectangle: "rectangle",
    Point: "point",
    Reset: "reset",
    Overturn: "overturn",
    Calculate: "calculate",
    Measure: "measure",
    Decrease: "decrease",
    Split: "split",
    Save: "save",
} as const

export type ClickKey = (typeof CLICK_KEY)[keyof typeof CLICK_KEY]

export default CLICK_KEY
