export const CALCULATE_ACTION = {
    Sharp: "sharp",
    FrontMolar: "front-molar",
    Molar: "molar",
} as const

export type CalculateAction = (typeof CALCULATE_ACTION)[keyof typeof CALCULATE_ACTION]
