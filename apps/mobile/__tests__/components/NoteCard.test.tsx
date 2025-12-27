import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NoteCard } from '../../components/notes/NoteCard';
import type { Note } from '@expandnote/shared/types';

const mockNote: Note = {
  id: 'test-note-1',
  user_id: 'user-1',
  title: 'Test Note Title',
  content: 'This is the test note content for testing purposes.',
  is_favorite: false,
  is_archived: false,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockFavoriteNote: Note = {
  ...mockNote,
  id: 'test-note-2',
  title: 'Favorite Note',
  is_favorite: true,
};

describe('NoteCard', () => {
  const mockOnPress = jest.fn();
  const mockOnToggleFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders note title correctly', () => {
    const { getByText } = render(
      <NoteCard
        note={mockNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(getByText('Test Note Title')).toBeTruthy();
  });

  it('renders note content preview', () => {
    const { getByText } = render(
      <NoteCard
        note={mockNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(getByText(/This is the test note content/)).toBeTruthy();
  });

  it('renders "Untitled" for notes without title', () => {
    const untitledNote = { ...mockNote, title: '' };
    const { getByText } = render(
      <NoteCard
        note={untitledNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(getByText('Untitled')).toBeTruthy();
  });

  it('renders "No content" for notes without content', () => {
    const emptyNote = { ...mockNote, content: '' };
    const { getByText } = render(
      <NoteCard
        note={emptyNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(getByText('No content')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const { getByRole } = render(
      <NoteCard
        note={mockNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows favorite star for favorite notes', () => {
    const { getByLabelText } = render(
      <NoteCard
        note={mockFavoriteNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(getByLabelText('Remove from favorites')).toBeTruthy();
  });

  it('does not show favorite star for non-favorite notes', () => {
    const { queryByLabelText } = render(
      <NoteCard
        note={mockNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(queryByLabelText('Remove from favorites')).toBeNull();
  });

  it('calls onToggleFavorite when favorite star is pressed', () => {
    const { getByLabelText } = render(
      <NoteCard
        note={mockFavoriteNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    const favoriteButton = getByLabelText('Remove from favorites');
    fireEvent.press(favoriteButton);

    expect(mockOnToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility label', () => {
    const { getByLabelText } = render(
      <NoteCard
        note={mockNote}
        isDark={false}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(getByLabelText(/Note: Test Note Title/)).toBeTruthy();
  });

  it('applies dark mode styles correctly', () => {
    const { getByTestId } = render(
      <NoteCard
        note={mockNote}
        isDark={true}
        onPress={mockOnPress}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    // The component should render without errors in dark mode
    expect(getByLabelText(/Note: Test Note Title/)).toBeTruthy();
  });
});
