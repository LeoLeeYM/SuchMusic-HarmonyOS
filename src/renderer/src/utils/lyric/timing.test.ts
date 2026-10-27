import { describe, expect, it } from 'vitest'
import { lyricTimeSeconds, wordProgress } from './timing'

describe('lyric timing', () => {
  it('interpolates native progress and holds while paused or loading', () => {
    expect(lyricTimeSeconds(1000, 250, true, false)).toBe(1.25)
    expect(lyricTimeSeconds(1000, 10000, false, false)).toBe(1)
    expect(lyricTimeSeconds(1000, 10000, true, true)).toBe(1)
  })
  it('bounds stale native ticks and the end of a song', () => {
    expect(lyricTimeSeconds(1000, 90000, true, false)).toBe(2)
    expect(lyricTimeSeconds(1900, 500, true, false, 2000)).toBe(2)
  })
  it('moves the fill both forward and backward after seeking', () => {
    expect(wordProgress(1.5, 1, 2)).toBe(50)
    expect(wordProgress(3, 1, 2)).toBe(100)
    expect(wordProgress(0.5, 1, 2)).toBe(0)
  })
  it('does not light up future zero-duration tokens', () => {
    expect(wordProgress(1, 2, 2)).toBe(0)
    expect(wordProgress(2, 2, 2)).toBe(100)
  })
})
