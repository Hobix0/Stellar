/* ==================================================================
   Stellar · Leiste über einer Tagesnotiz
   Vor/zurück, „Heute“, Kalender und die an diesem Tag fälligen Aufgaben.
   ================================================================== */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Task } from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';
import { Icon } from '../../components/ui/Icon';
import { anchorBelow, Popover, type PopoverAnchor } from '../../components/ui/Popover';
import { addDays, todayIsoDate } from '../../lib/dates';
import { DueBadge, PriorityBadge } from '../projects/TaskMeta';
import { MiniCalendar } from './MiniCalendar';

export function DailyNoteBar({ date }: { date: string }) {
    const navigate = useNavigate();
    const [calendarAnchor, setCalendarAnchor] = useState<PopoverAnchor | null>(null);
    const [dueTasks, setDueTasks] = useState<Task[]>([]);
    const isToday = date === todayIsoDate();

    useEffect(() => {
        projectsApi.listOpenTasksDueOn(date).then(setDueTasks).catch(console.error);
    }, [date]);

    const openDate = (isoDate: string) => {
        setCalendarAnchor(null);
        navigate(`/daily/${isoDate}`);
    };

    return (
        <div className="daily-bar">
            <div className="daily-bar-nav">
                <span className="daily-bar-label">Tagesnotiz</span>
                <button className="icon-button icon-button-small" title="Vorheriger Tag" onClick={() => openDate(addDays(date, -1))}>
                    <Icon name="chevronLeft" size={15} />
                </button>
                <button className="button button-small button-ghost" disabled={isToday} onClick={() => openDate(todayIsoDate())}>
                    Heute
                </button>
                <button className="icon-button icon-button-small" title="Nächster Tag" onClick={() => openDate(addDays(date, 1))}>
                    <Icon name="chevronRight" size={15} />
                </button>
                <button className="icon-button icon-button-small" title="Kalender" onClick={event => setCalendarAnchor(anchorBelow(event.currentTarget))}>
                    <Icon name="calendar" size={15} />
                </button>
            </div>

            {dueTasks.length > 0 && (
                <div className="daily-tasks">
                    <span className="daily-bar-label">{isToday ? 'Heute fällig' : 'An diesem Tag fällig'}</span>
                    {dueTasks.map(task => (
                        <Link key={task.id} to={`/projects/${task.projectId}?task=${task.id}`} className="daily-task">
                            <PriorityBadge priority={task.priority} />
                            <span>{task.title}</span>
                            <DueBadge task={task} />
                        </Link>
                    ))}
                </div>
            )}

            {calendarAnchor && (
                <Popover anchor={calendarAnchor} onClose={() => setCalendarAnchor(null)}>
                    <MiniCalendar selectedDate={date} onSelect={openDate} />
                </Popover>
            )}
        </div>
    );
}
