import { useCallback, useRef, useState } from 'react';
import { cloneEditState, createDefaultEditState, type EditState } from '../engine/editState';

const MAX = 30;

/** Slider jestleri için başlangıç anlık görüntüsü; tamamlanınca geçmişe tek adım yazılır. */
export function useUndoableEditState() {
  const [current, setCurrent] = useState<EditState>(createDefaultEditState());
  const [past, setPast] = useState<EditState[]>([]);
  const [future, setFuture] = useState<EditState[]>([]);
  const curRef = useRef(current);
  curRef.current = current;
  const gestureStartRef = useRef<EditState | null>(null);

  const beginGesture = useCallback(() => {
    gestureStartRef.current = cloneEditState(curRef.current);
  }, []);

  const endGesture = useCallback(() => {
    const start = gestureStartRef.current;
    gestureStartRef.current = null;
    if (!start) return;
    if (JSON.stringify(start) === JSON.stringify(curRef.current)) return;
    setPast((p) => [...p.slice(-(MAX - 1)), start]);
    setFuture([]);
  }, []);

  const update = useCallback((fn: (p: EditState) => EditState) => {
    setCurrent((c) => cloneEditState(fn(c)));
  }, []);

  const replace = useCallback((next: EditState) => {
    setCurrent(cloneEditState(next));
  }, []);

  /** Preset / HSL sekmesi gibi anında uygulanan değişiklikler. */
  const commitReplace = useCallback((next: EditState) => {
    setPast((p) => [...p.slice(-(MAX - 1)), cloneEditState(curRef.current)]);
    setFuture([]);
    setCurrent(cloneEditState(next));
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [cloneEditState(curRef.current), ...f].slice(0, MAX));
      setCurrent(cloneEditState(prev));
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const n = f[0];
      setPast((p) => [...p.slice(-(MAX - 1)), cloneEditState(curRef.current)]);
      setCurrent(cloneEditState(n));
      return f.slice(1);
    });
  }, []);

  return {
    current,
    update,
    replace,
    commitReplace,
    beginGesture,
    endGesture,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
