import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if we're in an input, textarea, or contenteditable element
      const target = event.target;
      const isInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;

      // Check for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      const altModifier = event.altKey;
      const shiftModifier = event.shiftKey;

      // Build key string
      let keyString = '';
      if (modifier) keyString += (isMac ? 'cmd+' : 'ctrl+');
      if (altModifier) keyString += 'alt+';
      if (shiftModifier) keyString += 'shift+';
      keyString += event.key.toLowerCase();

      // Find matching shortcut
      const shortcut = shortcuts.find(s => s.key === keyString);
      if (shortcut) {
        // Check if shortcut should be disabled when in input
        if (!shortcut.allowInInput && isInput) {
          return;
        }

        event.preventDefault();
        shortcut.handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}


