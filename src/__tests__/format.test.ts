import { describe, expect, it } from 'vitest'
import { withJosa } from '../format'


describe('조사', () => {
  it('받침이 있으면 이, 없으면 가', () => {
    expect(withJosa('김민준', '이', '가')).toBe('김민준이')
    expect(withJosa('예준', '이', '가')).toBe('예준이')
    expect(withJosa('민수', '이', '가')).toBe('민수가')
  })

  it('한글이 아닌 이름은 받침 없는 쪽으로', () => {
    expect(withJosa('Alice', '이', '가')).toBe('Alice가')
  })
})
