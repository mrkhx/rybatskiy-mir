import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LakeSound } from './LakeSound';
const audio = vi.hoisted(() => ({ cue: vi.fn(), configure: vi.fn(), resume: vi.fn().mockResolvedValue(undefined), pause: vi.fn().mockResolvedValue(undefined), close: vi.fn(), volume: vi.fn() }));
vi.mock('./forestLakeAudio', () => ({ ForestLakeAudio: vi.fn(function () { return audio; }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const base = { spot: 'old-bridge', tod: 'MORNING', wx: 'CLEAR', phase: 'WAIT', state: 'WAITING_BITE', reelNonce: 0 };
describe('lake audio lifecycle', () => {
  it('waits for user activation and does not replay the current bite on activation', async () => {
    render(<LakeSound {...base} state="BITE" />);
    expect(audio.resume).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true'));
    expect(audio.cue).not.toHaveBeenCalled();
  });
  it('plays one bite per server transition, never from the visual clip alone', async () => {
    const r = render(<LakeSound {...base} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true'));
    r.rerender(<LakeSound {...base} phase="BITE_REACTION" />);
    expect(audio.cue).not.toHaveBeenCalled();
    r.rerender(<LakeSound {...base} phase="BITE_REACTION" state="BITE" />);
    r.rerender(<LakeSound {...base} phase="BITE_REACTION" state="BITE" />);
    expect(audio.cue).toHaveBeenCalledExactlyOnceWith('bite');
    r.unmount(); expect(audio.close).toHaveBeenCalledOnce();
  });
});
