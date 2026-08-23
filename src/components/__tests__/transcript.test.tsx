import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Transcript } from '../Transcript'
import { PlayerControlsContext, PlayerTimeContext, type PlayerControls } from '../../player-context'
import type { Segment } from '../../api'

function seg(idx: number, start: number, end: number, extra: Partial<Segment> = {}): Segment {
  return {
    idx,
    start_sec: start,
    end_sec: end,
    speaker_key: 'SPEAKER_00',
    text: `문장 ${idx}`,
    kind: 'speech',
    ...extra,
  }
}

const track = { recordingId: 'r1', title: '회의' }

function harness(currentTime: number, controls: Partial<PlayerControls> = {}) {
  const value: PlayerControls = {
    track,
    rate: 1,
    play: vi.fn(),
    seek: vi.fn(),
    toggle: vi.fn(),
    setRate: vi.fn(),
    ...controls,
  }
  return { value, time: { currentTime, duration: 100 } }
}

function renderTranscript(
  currentTime: number,
  props: Partial<Parameters<typeof Transcript>[0]> = {},
  controls: Partial<PlayerControls> = {},
) {
  const { value, time } = harness(currentTime, controls)
  const ui = (
    <PlayerControlsContext value={value}>
      <PlayerTimeContext value={time}>
        <Transcript
          segments={[seg(0, 0, 5), seg(1, 5, 10)]}
          speakerNames={{ SPEAKER_00: '김실명' }}
          track={track}
          {...props}
        />
      </PlayerTimeContext>
    </PlayerControlsContext>
  )
  return { ...render(ui), value }
}

describe('전사 뷰', () => {
  it('재생 중인 구간을 표시한다', () => {
    renderTranscript(7)

    expect(document.getElementById('seg-1')).toHaveStyle({ background: 'var(--accent-subtle)' })
    expect(document.getElementById('seg-0')).not.toHaveStyle({ background: 'var(--accent-subtle)' })
  })

  it('다른 녹음을 재생 중이면 검색에서 온 자리를 표시한다', () => {
    renderTranscript(7, { focusIdx: 0 }, { track: { recordingId: 'other', title: '다른 것' } })

    expect(document.getElementById('seg-0')).toHaveStyle({ background: 'var(--accent-subtle)' })
  })

  it('고칠 수 없으면 화자 이름을 버튼으로 그리지 않는다', () => {
    // 눌러도 아무 일이 없으면 무엇이 잘못됐는지 알 길이 없다
    renderTranscript(0)

    expect(screen.queryByRole('button', { name: '김실명' })).toBeNull()
    expect(screen.getAllByText('김실명')[0].tagName).toBe('SPAN')
  })

  it('고칠 수 있으면 눌러서 이름을 바꾼다', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)
    renderTranscript(0, { onRename })

    await userEvent.click(screen.getAllByRole('button', { name: '김실명' })[0])
    const input = screen.getByLabelText('화자 이름')
    await userEvent.clear(input)
    await userEvent.type(input, '박이름{Enter}')

    expect(onRename).toHaveBeenCalledWith('SPEAKER_00', '박이름')
  })

  it('화자 이름을 막으면 라벨만 남는다', () => {
    // 링크가 실명 노출을 껐을 때다. 화자 구분은 남아야 회의록이 읽힌다
    renderTranscript(0, { showSpeakerNames: false })

    expect(screen.queryByText('김실명')).toBeNull()
    expect(screen.getAllByText('SPEAKER_00')[0]).toBeInTheDocument()
  })

  it('받아적지 못한 구간도 눌러서 듣는다', async () => {
    const play = vi.fn()
    renderTranscript(0, { segments: [seg(0, 0, 5, { kind: 'noise', text: '' })] }, { play })

    await userEvent.click(screen.getByRole('button', { name: /받아적지 못한 구간/ }))

    expect(play).toHaveBeenCalledWith(track, 0)
  })

  it('전사가 없으면 그 사실을 말한다', () => {
    renderTranscript(0, { segments: [] })

    expect(screen.getByText(/아직 전사 결과가 없습니다/)).toBeInTheDocument()
  })
})

describe('활성 구간', () => {
  it('시간이 같은 구간 안에서 움직이면 활성 표시가 그대로다', () => {
    // memo가 걸러 내는 것이 이 성질이다. memo 자체는 DOM으로 관찰할 수 없어
    // (React가 같은 출력이면 DOM을 건드리지 않는다) 성질만 고정한다
    const { rerender } = renderTranscript(6)
    expect(document.getElementById('seg-1')).toHaveStyle({ background: 'var(--accent-subtle)' })

    const { value, time } = harness(9)
    rerender(
      <PlayerControlsContext value={value}>
        <PlayerTimeContext value={time}>
          <Transcript
            segments={[seg(0, 0, 5), seg(1, 5, 10)]}
            speakerNames={{ SPEAKER_00: '김실명' }}
            track={track}
          />
        </PlayerTimeContext>
      </PlayerControlsContext>,
    )

    expect(document.getElementById('seg-1')).toHaveStyle({ background: 'var(--accent-subtle)' })
    expect(document.getElementById('seg-0')).not.toHaveStyle({ background: 'var(--accent-subtle)' })
  })
})
