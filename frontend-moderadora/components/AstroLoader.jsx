import styles from './AstroLoader.module.scss';

const STAR_LAYERS = [1, 2, 3, 4];
const STAR_POSITIONS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Carregamento animado inspirado no astronauta de JkHuger (Uiverse.io).
 * variant: "fullscreen" (transições/autenticação), "section" (dados)
 * ou "overlay" (operações de gravação sem perder o formulário).
 * Mantém as estrelas confinadas na cena e respeita movimento reduzido.
 */
export default function AstroLoader({
  label = 'Carregando…',
  variant = 'section',
}) {
  const mode = ['fullscreen', 'section', 'overlay'].includes(variant) ? variant : 'section';

  return (
    <div
      className={`${styles.loader} ${styles[mode]}`}
      role="status"
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.scene} aria-hidden="true">
        {STAR_LAYERS.map((layer) => (
          <div key={layer} className={`${styles.starField} ${styles[`starField${layer}`]}`}>
            {STAR_POSITIONS.map((index) => (
              <span key={index} className={`${styles.star} ${styles[`starPosition${index}`]}`} />
            ))}
          </div>
        ))}

        <div className={styles.sprite}>
          <div className={styles.astronaut}>
            <div className={styles.head} />
            <div className={`${styles.arm} ${styles.armLeft}`} />
            <div className={`${styles.arm} ${styles.armRight}`} />
            <div className={styles.body}>
              <div className={styles.panel} />
            </div>
            <div className={`${styles.leg} ${styles.legLeft}`} />
            <div className={`${styles.leg} ${styles.legRight}`} />
            <div className={styles.schoolbag} />
          </div>
        </div>
      </div>
      <p className={styles.message} aria-hidden="true">{label}</p>
    </div>
  );
}
