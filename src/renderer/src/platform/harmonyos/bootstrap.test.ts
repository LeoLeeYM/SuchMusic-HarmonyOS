import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function runtime() {
  const calls: string[] = []
  const properties = new Map<string, string>()
  const events = new Map<string, () => void>()
  const document = { documentElement: { dataset: {}, style: { setProperty: (key: string, value: string) => properties.set(key, value) } } }
  const window: any = {
    SuchHarmony: { postMessage: (value: string) => calls.push(value) },
    innerWidth: 440,
    addEventListener: (name: string, callback: () => void) => events.set(name, callback)
  }
  vm.runInNewContext(readFileSync(new URL('./bootstrap.js', import.meta.url), 'utf8'), {
    window, document, console, setTimeout, clearTimeout, Map, Promise, Error
  })
  return { window, calls, properties, events }
}
describe('HarmonyOS Capacitor compatibility bridge', () => {
  it('correlates concurrent native responses and converts HTTP verbs', async () => {
    const { window, calls } = runtime()
    const first = window.Capacitor.nativePromise('CapacitorHttp', 'get', { url: 'https://example.test' })
    const second = window.Capacitor.nativePromise('Filesystem', 'stat', { path: 'music/test.mp3' })
    const requests = calls.map(value => JSON.parse(value))
    expect(requests[0].options.method).toBe('GET')
    window.__suchHarmonyReply(requests[1].id, true, { size: 42 })
    window.__suchHarmonyReply(requests[0].id, true, { status: 200 })
    expect(await first).toEqual({ status: 200 })
    expect(await second).toEqual({ size: 42 })
  })
  it('rejects native failures rather than reporting successful empty results', async () => {
    const { window, calls } = runtime()
    const result = window.Capacitor.nativePromise('Filesystem', 'readFile', { path: '../outside' })
    window.__suchHarmonyReply(JSON.parse(calls[0]).id, false, '不允许访问此路径')
    await expect(result).rejects.toThrow('不允许访问此路径')
  })
  it('routes and removes retained event listeners', async () => {
    const { window } = runtime()
    const states: string[] = []
    const id = window.Capacitor.nativeCallback('SuchPlayer', 'addListener', { eventName: 'state' }, (state: { state: string }) => states.push(state.state))
    window.__suchHarmonyEvent('SuchPlayer', 'state', { state: 'playing' })
    window.__suchHarmonyEvent('Other', 'state', { state: 'paused' })
    await window.Capacitor.nativePromise('SuchPlayer', 'removeListener', { callbackId: id })
    window.__suchHarmonyEvent('SuchPlayer', 'state', { state: 'paused' })
    expect(states).toEqual(['playing'])
  })
})


describe('HarmonyOS safe areas', () => {
  it('converts physical window pixels into CSS pixels for all edges', () => {
    const { window, properties } = runtime()
    window.__suchHarmonyInsets({ windowWidth: 1320, top: 126, bottom: 84, left: 0, right: 60 })
    expect(Object.fromEntries(properties)).toEqual({
      '--safe-area-inset-top': '42px', '--safe-area-inset-bottom': '28px',
      '--safe-area-inset-left': '0px', '--safe-area-inset-right': '20px'
    })
  })
  it('updates after viewport resize and clears obsolete portrait insets', () => {
    const { window, properties, events } = runtime()
    window.__suchHarmonyInsets({ windowWidth: 1320, top: 126, bottom: 84, left: 0, right: 0 })
    window.innerWidth = 660
    events.get('resize')?.()
    expect(properties.get('--safe-area-inset-top')).toBe('63px')
    window.__suchHarmonyInsets({ windowWidth: 1980, top: 0, bottom: 84, left: 126, right: 0 })
    expect(properties.get('--safe-area-inset-top')).toBe('0px')
    expect(properties.get('--safe-area-inset-left')).toBe('42px')
  })
})
