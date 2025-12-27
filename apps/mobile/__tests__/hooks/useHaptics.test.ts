import { renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useHaptics } from '../../hooks/useHaptics';

jest.mock('expo-haptics');

describe('useHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger light impact', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.light();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('should trigger medium impact', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.medium();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('should trigger heavy impact', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.heavy();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  });

  it('should trigger success notification', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.success();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('should trigger warning notification', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.warning();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Warning
    );
  });

  it('should trigger error notification', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.error();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error
    );
  });

  it('should trigger selection feedback', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.selection();
    });

    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('should trigger with custom type using trigger function', async () => {
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.trigger('heavy');
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  });
});
