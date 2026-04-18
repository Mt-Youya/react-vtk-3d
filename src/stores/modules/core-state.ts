import { create } from "zustand"
import type { CoreMethods } from "@/types"

interface CoreState {
    coreMethods: CoreMethods | null
    setCoreMethods: (coreMethods: CoreMethods) => void
}

export const useCoreStore = create<CoreState>((set) => ({
    coreMethods: null,
    setCoreMethods: (coreMethods) => set(() => ({ coreMethods })),
}))
