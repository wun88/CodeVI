import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import Header from '../../components/Header/Header';
import styles from './InternalHome.module.css';

type Props = {
  onLoginClick: () => void;
};

export default function InternalHome({ onLoginClick }: Props) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const q = gsap.utils.selector(root);

    const xTo = gsap.quickTo(root, '--x', { duration: 0.45, ease: 'expo.out', units: 'px' });
    const yTo = gsap.quickTo(root, '--y', { duration: 0.45, ease: 'expo.out', units: 'px' });
    const pxTo = gsap.quickTo(root, '--px', { duration: 0.65, ease: 'expo.out', units: 'px' });
    const pyTo = gsap.quickTo(root, '--py', { duration: 0.65, ease: 'expo.out', units: 'px' });
    const srTo = gsap.quickTo(root, '--sr', { duration: 0.55, ease: 'expo.out', units: 'px' });
    const trTo = gsap.quickTo(root, '--tr', { duration: 0.55, ease: 'expo.out', units: 'px' });

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);

      const nx = e.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const ny = e.clientY / Math.max(window.innerHeight, 1) - 0.5;
      pxTo(nx * -22);
      pyTo(ny * -22);

      // speed-reactive softness (still one light field)
      const dx = e.movementX ?? 0;
      const dy = e.movementY ?? 0;
      const speed = Math.min(420, Math.hypot(dx, dy) * 18);
      srTo(520 + speed * 0.75);
      trTo(720 + speed * 0.9);
    };

    const onLeave = () => {
      xTo(-9999);
      yTo(-9999);
      pxTo(0);
      pyTo(0);
      srTo(520);
      trTo(720);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    onLeave();

    // Floating system messages (sequential order: 1 -> 2 -> 3)
    const msgs = q('[data-sysmsg]');
    const showOne = (el: Element, hold: number) => {
      return gsap
        .timeline()
        .set(el, { opacity: 0, filter: 'blur(8px)', y: 8, clipPath: 'inset(0 100% 0 0 round 10px)' })
        .to(el, {
          opacity: 0.38,
          filter: 'blur(0px)',
          y: 0,
          duration: 0.62,
          ease: 'expo.out',
        })
        .to(
          el,
          {
            clipPath: 'inset(0 0% 0 0 round 10px)',
            duration: 0.52,
            ease: 'power3.out',
          },
          0
        )
        .to(el, { opacity: 0.32, duration: hold, ease: 'none' })
        .to(el, {
          opacity: 0,
          filter: 'blur(9px)',
          y: -6,
          duration: 0.72,
          ease: 'power3.inOut',
        });
    };

    if (msgs.length >= 3) {
      const holds = msgs.map((el) => Number((el as HTMLElement).dataset.hold ?? 1.0));
      const baseDelay = Number((msgs[0] as HTMLElement).dataset.delay ?? 0.6);
      const gap = 0.22;

      const tl = gsap.timeline({ repeat: -1, delay: baseDelay });
      msgs.slice(0, 3).forEach((msg, index) => {
        tl.add(showOne(msg, holds[index])).to({}, { duration: gap });
      });
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.page}>
      <Header onLoginClick={onLoginClick} variant="internal" />

      <div className={styles.bg} aria-hidden="true">
        <div className={styles.gearSilhouette} />
        <div className={styles.scanLine} />
        <div className={styles.codeFrags}>
          <span
            className={styles.codeFrag}
            style={{
              left: '8%',
              top: '14%',
              ['--fs' as any]: '12px',
              ['--op' as any]: '0.07',
              ['--bl' as any]: '0.8px',
              ['--dur' as any]: '12.5s',
              ['--del' as any]: '-3.2s',
              ['--dx' as any]: '-2px',
              ['--dy' as any]: '4px',
            }}
            data-text="parse()"
          >
            parse()
          </span>
          <span
            className={styles.codeFrag}
            style={{
              left: '22%',
              top: '76%',
              ['--fs' as any]: '13px',
              ['--op' as any]: '0.05',
              ['--bl' as any]: '1px',
              ['--dur' as any]: '13.8s',
              ['--del' as any]: '-8.1s',
              ['--dx' as any]: '1px',
              ['--dy' as any]: '-3px',
            }}
            data-text="AST"
          >
            AST
          </span>
          <span
            className={styles.codeFrag}
            style={{
              left: '66%',
              top: '18%',
              ['--fs' as any]: '12px',
              ['--op' as any]: '0.04',
              ['--bl' as any]: '1.2px',
              ['--dur' as any]: '10.6s',
              ['--del' as any]: '-1.4s',
              ['--dx' as any]: '3px',
              ['--dy' as any]: '2px',
            }}
            data-text="refactor()"
          >
            refactor()
          </span>
          <span
            className={styles.codeFrag}
            style={{
              left: '78%',
              top: '62%',
              ['--fs' as any]: '14px',
              ['--op' as any]: '0.06',
              ['--bl' as any]: '0.6px',
              ['--dur' as any]: '14.2s',
              ['--del' as any]: '-6.6s',
              ['--dx' as any]: '-3px',
              ['--dy' as any]: '-4px',
            }}
            data-text="quality++"
          >
            quality++
          </span>
          <span
            className={styles.codeFrag}
            style={{
              left: '56%',
              top: '70%',
              ['--fs' as any]: '15px',
              ['--op' as any]: '0.08',
              ['--bl' as any]: '0.4px',
              ['--dur' as any]: '11.4s',
              ['--del' as any]: '-9.2s',
              ['--dx' as any]: '2px',
              ['--dy' as any]: '3px',
            }}
            data-text="graph.build()"
          >
            graph.build()
          </span>
        </div>
      </div>

      <div className={styles.sysMsgs} aria-hidden="true">
        <div
          className={styles.sysMsg}
          data-sysmsg
          data-delay="0.8"
          data-hold="0.85"
          style={{ left: '18vw', top: '34vh' }}
        >
          코드를 <span className={styles.sysAccent}>해부</span>하고
        </div>
        <div
          className={styles.sysMsg}
          data-sysmsg
          data-hold="0.85"
          style={{ left: '46vw', top: '68vh' }}
        >
          구조를 <span className={styles.sysAccent}>시각화</span>하고
        </div>
        <div
          className={styles.sysMsg}
          data-sysmsg
          data-hold="1.2"
          style={{ left: '62vw', top: '44vh' }}
        >
          더 나은 형태로 다시 <span className={styles.sysAccent}>설계</span>합니다
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.ctaArea}>
          <button
            type="button"
            className={styles.cta}
            onClick={() => navigate('/code-insight')}
          >
            <span className={styles.ctaLabel}>
              코드 진단하기 <span className={styles.ctaArrow}>→</span>
            </span>
            <svg className={styles.ctaGlow} aria-hidden="true" viewBox="0 0 100 44" preserveAspectRatio="none">
              <rect className={styles.ctaGlowBlur} x="1" y="1" width="98" height="42" rx="22" ry="22" pathLength="100" />
              <rect className={styles.ctaGlowLine} x="1" y="1" width="98" height="42" rx="22" ry="22" pathLength="100" />
            </svg>
          </button>
          <div className={styles.ctaSub}>Start analyzing your code structure</div>
        </div>
      </main>

      <div className={styles.bigWordLayer} aria-hidden="true">
        <div className={styles.heroTitle} aria-hidden="true" />
      </div>

      <div className={styles.spotlightLayer} aria-hidden="true" />
    </div>
  );
}
