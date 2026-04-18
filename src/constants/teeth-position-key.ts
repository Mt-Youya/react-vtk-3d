const TEETH_POSITION = {
    Up: "up",
    Down: "down",
} as const

export type TeethPosition = (typeof TEETH_POSITION)[keyof typeof TEETH_POSITION]

export default TEETH_POSITION
