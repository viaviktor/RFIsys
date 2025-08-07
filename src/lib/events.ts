// Simple global event system for triggering data refreshes
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  off(event: string, callback: Function) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(cb => cb !== callback)
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return
    this.events[event].forEach(callback => callback(...args))
  }
}

// Global event emitter instance
export const globalEvents = new EventEmitter()

// Event names
export const EVENTS = {
  RFI_DELETED: 'rfi:deleted',
  RFI_CREATED: 'rfi:created',
  RFI_UPDATED: 'rfi:updated',
  PROJECT_DELETED: 'project:deleted',
  PROJECT_UPDATED: 'project:updated',
  CLIENT_DELETED: 'client:deleted',
  CLIENT_UPDATED: 'client:updated',
  REFRESH_ALL: 'refresh:all',
} as const