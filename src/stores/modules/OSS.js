import { create } from "zustand"

export const useOSSStore = create(set => ({
    client: null,
    setClient: client => set({ client }),
}))
