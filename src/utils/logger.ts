/**
 * 统一日志工具
 * 开发环境输出调试信息，生产环境静默
 */
const isDev = import.meta.env.DEV

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  time: (label: string) => {
    if (isDev) console.time(label)
  },
  timeEnd: (label: string) => {
    if (isDev) console.timeEnd(label)
  },
}
