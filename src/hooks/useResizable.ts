import { useCallback } from 'react';
import { useEditorStore } from '@/store';

export function useResizable(side: 'left' | 'right') {
  const width = useEditorStore((s) =>
    side === 'left' ? s.leftPanelWidth : s.rightPanelWidth
  );
  const setWidth = useEditorStore((s) =>
    side === 'left' ? s.setLeftPanelWidth : s.setRightPanelWidth
  );

  const handleResize = useCallback(
    (newWidth: number) => {
      setWidth(newWidth);
    },
    [setWidth]
  );

  return { width, handleResize };
}
