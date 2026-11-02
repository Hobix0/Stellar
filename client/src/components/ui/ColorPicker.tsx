import { COLOR_NAMES, type ColorName } from '../../../../shared/types';

/** Reihe farbiger Punkte zur Auswahl einer Farbe (Projekte, Labels). */
export function ColorPicker({ value, onChange }: { value: ColorName; onChange: (color: ColorName) => void }) {
    return (
        <div className="color-picker" role="radiogroup" aria-label="Farbe">
            {COLOR_NAMES.map(color => (
                <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={value === color}
                    aria-label={color}
                    className={`color-dot color-${color} ${value === color ? 'is-selected' : ''}`}
                    onClick={() => onChange(color)}
                />
            ))}
        </div>
    );
}
