/**
 * shortcuts.ts
 * Keyboard shortcut reference for Onobase.
 * Onobase — Obnet Pty Ltd © 2026
 */

export interface ShortcutEntry {
  keys: string[]
  action: string
}

export interface ShortcutCategory {
  category: string
  shortcuts: ShortcutEntry[]
}

export const SHORTCUTS: ShortcutCategory[] = [
  {
    category: 'Query Editor',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], action: 'Execute Query' },
      { keys: ['F5'],            action: 'Execute Query' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Format SQL' },
      { keys: ['Ctrl', 'S'],    action: 'Save Query' },
      { keys: ['Ctrl', 'Z'],    action: 'Undo' },
      { keys: ['Ctrl', 'Y'],    action: 'Redo' },
      { keys: ['Ctrl', '/'],    action: 'Toggle Comment' },
      { keys: ['Ctrl', 'Space'], action: 'Trigger Autocomplete' },
    ],
  },
  {
    category: 'Application',
    shortcuts: [
      { keys: ['Ctrl', 'N'],          action: 'New Query Tab' },
      { keys: ['Ctrl', 'W'],          action: 'Close Tab' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Global Search' },
      { keys: ['F11'],                action: 'Presentation Mode' },
      { keys: ['Ctrl', ','],          action: 'Open Settings' },
    ],
  },
  {
    category: 'Canvas',
    shortcuts: [
      { keys: ['Ctrl', 'Scroll'], action: 'Zoom In/Out' },
      { keys: ['Delete'],         action: 'Delete Selected Module' },
    ],
  },
  {
    category: 'Data Viewer',
    shortcuts: [
      { keys: ['Ctrl', 'S'],     action: 'Save Pending Changes' },
      { keys: ['Escape'],        action: 'Discard Cell Edit' },
      { keys: ['Tab'],           action: 'Next Cell' },
      { keys: ['Enter'],         action: 'Confirm Cell Edit' },
    ],
  },
]
