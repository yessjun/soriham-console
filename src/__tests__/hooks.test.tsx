import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAsync } from '../hooks'

describe('useAsync', () => {
  it('무엇을 부르는지가 바뀌면 앞 값을 버린다', async () => {
    // 그대로 두면 다른 녹음의 주소에 앞 녹음의 전사가, 새 워크스페이스 이름표 아래
    // 앞 워크스페이스의 목록이 남는다
    const { result, rerender } = renderHook(({ id }) => useAsync(() => Promise.resolve(id), [id]), {
      initialProps: { id: 'a' },
    })
    await waitFor(() => expect(result.current.data).toBe('a'))

    rerender({ id: 'b' })
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.data).toBe('b'))
  })

  it('같은 대상을 다시 부를 때는 값을 그대로 둔다', async () => {
    // 폴링마다 화면이 비면 5초마다 깜빡인다
    const { result } = renderHook(() => useAsync(() => Promise.resolve('그대로'), ['같음']))
    await waitFor(() => expect(result.current.data).toBe('그대로'))

    result.current.reload()
    expect(result.current.data).toBe('그대로')
  })
})

describe('useAsync의 refreshDeps', () => {
  it('다시 부르되 앞 값을 비우지 않는다', async () => {
    // 업로드 완료와 더 보기는 같은 목록을 다시 부르는 것이다. 여기서 비우면
    // 파일 하나 올릴 때마다, 더 보기를 누를 때마다 목록이 통째로 깜빡인다
    let calls = 0
    const { result, rerender } = renderHook(
      ({ n }) =>
        useAsync(
          () => {
            calls += 1
            return Promise.resolve(`값${calls}`)
          },
          ['같은대상'],
          [n],
        ),
      { initialProps: { n: 0 } },
    )
    await waitFor(() => expect(result.current.data).toBe('값1'))

    rerender({ n: 1 })
    expect(result.current.data).toBe('값1')
    await waitFor(() => expect(result.current.data).toBe('값2'))
  })
})
