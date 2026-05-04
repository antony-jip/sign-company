import { useCallback } from 'react'
import { toast } from 'sonner'
import type { Dispatch, SetStateAction } from 'react'

interface OptimisticArgs<T> {
  snapshot: T
  apply: (prev: T) => T
  commit: () => Promise<T | void | ((prev: T) => T)>
  errorMessage: string
}

export function useOptimisticState<T>(setState: Dispatch<SetStateAction<T>>) {
  return useCallback(async (args: OptimisticArgs<T>): Promise<boolean> => {
    setState(args.apply(args.snapshot))
    try {
      const result = await args.commit()
      if (result !== undefined) {
        setState(typeof result === 'function' ? (result as (prev: T) => T) : (result as T))
      }
      return true
    } catch (err) {
      setState(args.snapshot)
      toast.error(args.errorMessage)
      return false
    }
  }, [setState])
}
