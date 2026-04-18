import { create } from "zustand"

interface TaskStatusState {
    status: number
    setStatus: (status: number) => void
}

export const useTaskStatusStore = create<TaskStatusState>((set) => ({
    status: 0,
    setStatus: (status) => set(() => ({ status })),
}))
