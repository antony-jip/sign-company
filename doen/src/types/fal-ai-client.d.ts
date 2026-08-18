declare module '@fal-ai/client' {
  interface FalClient {
    config(options: { credentials: string | undefined }): void
    storage: {
      upload(file: Blob | File): Promise<string>
    }
    subscribe(model: string, options: {
      input: Record<string, unknown>
      logs?: boolean
      onQueueUpdate?: (update: { status: string; logs?: Array<{ message: string }> }) => void
    }): Promise<{
      data: Record<string, unknown>
      requestId: string
    }>
  }

  export const fal: FalClient
}
