import { create } from "zustand"

export const useTaskStatusStore = create(set => ({
    status: 0,
    setStatus: status => set(_ => ({ status })),
}))
