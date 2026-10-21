export {}

declare global {
  interface Window {
    pywebview?: {
      api?: {
        close_app: () => void
      }
    }
    __lecturaFielRequestClose?: () => void
  }
}
