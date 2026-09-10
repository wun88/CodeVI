import { useEffect, useRef, useState } from 'react';
import styles from './FilterDropdown.module.css';

interface FilterDropdownOption<T extends string> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T extends string> {
  value: T;
  options: FilterDropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

/**
 * 커스텀 필터 드롭다운 — native `<select>`는 옵션 목록이 OS 팝업으로 렌더링돼 인터널 다크 테마와
 * 대비가 맞지 않는다(CodeInsight/InstantInsight.tsx의 언어 선택 드롭다운과 동일한 패턴을 재사용).
 */
export default function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as globalThis.Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={styles.select} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        // 폭이 좁아 라벨이 말줄임될 때 전문을 볼 수 있게 한다.
        title={selected?.label ?? value}
      >
        <span className={styles.dot} aria-hidden />
        <span className={styles.value}>{selected?.label ?? value}</span>
        <span className={`${styles.chevron} ${open ? styles.open : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className={styles.list} role="listbox" aria-label={ariaLabel}>
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`${styles.option} ${o.value === value ? styles.active : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
