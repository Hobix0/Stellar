/* ==================================================================
   Stellar · Monatskalender zum Springen zwischen Tagesnotizen
   Punkte markieren Tage, an denen etwas notiert wurde.
   ================================================================== */

import { useEffect, useState } from 'react';
import { dailyApi } from '../../api/dailyApi';
import { Icon } from '../../components/ui/Icon';
import { parseIsoDate, toIsoDate, todayIsoDate } from '../../lib/dates';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface MiniCalendarProps {
    selectedDate: string;
    onSelect: (isoDate: string) => void;
}

/** Alle Tage, die im Raster eines Monats stehen (inkl. Auffüllen ab Montag) */
function buildMonthGrid(year: number, monthIndex: number): (string | null)[] {
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    // getDay(): 0 = Sonntag → in Montag-zuerst umrechnen
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(toIsoDate(new Date(year, monthIndex, day)));
    return cells;
}

export function MiniCalendar({ selectedDate, onSelect }: MiniCalendarProps) {
    const selected = parseIsoDate(selectedDate);
    const [visibleMonth, setVisibleMonth] = useState({ year: selected.getFullYear(), monthIndex: selected.getMonth() });
    const [datesWithNotes, setDatesWithNotes] = useState<Set<string>>(new Set());
    const today = todayIsoDate();

    const yearMonth = `${visibleMonth.year}-${String(visibleMonth.monthIndex + 1).padStart(2, '0')}`;

    useEffect(() => {
        dailyApi
            .listDatesInMonth(yearMonth)
            .then(dates => setDatesWithNotes(new Set(dates)))
            .catch(console.error);
    }, [yearMonth]);

    const shiftMonth = (delta: number) => {
        const date = new Date(visibleMonth.year, visibleMonth.monthIndex + delta, 1);
        setVisibleMonth({ year: date.getFullYear(), monthIndex: date.getMonth() });
    };

    const monthLabel = new Date(visibleMonth.year, visibleMonth.monthIndex, 1).toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="mini-calendar">
            <div className="mini-calendar-header">
                <button className="icon-button icon-button-small" onClick={() => shiftMonth(-1)} aria-label="Voriger Monat">
                    <Icon name="chevronLeft" size={15} />
                </button>
                <span className="mini-calendar-title">{monthLabel}</span>
                <button className="icon-button icon-button-small" onClick={() => shiftMonth(1)} aria-label="Nächster Monat">
                    <Icon name="chevronRight" size={15} />
                </button>
            </div>
            <div className="mini-calendar-grid">
                {WEEKDAY_LABELS.map(label => (
                    <span key={label} className="mini-calendar-weekday">
                        {label}
                    </span>
                ))}
                {buildMonthGrid(visibleMonth.year, visibleMonth.monthIndex).map((isoDate, index) =>
                    isoDate ? (
                        <button
                            key={isoDate}
                            className={[
                                'mini-calendar-day',
                                isoDate === selectedDate ? 'is-selected' : '',
                                isoDate === today ? 'is-today' : '',
                                datesWithNotes.has(isoDate) ? 'has-note' : '',
                            ].join(' ')}
                            onClick={() => onSelect(isoDate)}
                        >
                            {Number(isoDate.slice(8))}
                        </button>
                    ) : (
                        <span key={`blank-${index}`} />
                    ),
                )}
            </div>
        </div>
    );
}
