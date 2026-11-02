/* ==================================================================
   Stellar · Schnellsuche (Strg/Cmd + K) über Seiten und Projekte
   Seiten: Volltextsuche auf dem Server. Projekte: Filter im Browser.
   ================================================================== */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project, SearchResult } from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';
import { wikiApi } from '../../api/wikiApi';
import { Modal } from '../../components/ui/Modal';
import { pageDisplayTitle, usePages } from './PagesContext';

interface SearchHit {
    key: string;
    icon: string;
    title: string;
    /** Textausschnitt mit <mark> – kommt bereits bereinigt vom Server */
    snippetHtml?: string;
    kind: string;
    url: string;
}

const SEARCH_DELAY_MS = 180;

export function SearchDialog({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const { pages } = usePages();
    const [query, setQuery] = useState('');
    const [pageResults, setPageResults] = useState<SearchResult[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        projectsApi.listProjects().then(setProjects).catch(console.error);
    }, []);

    // Volltextsuche leicht verzögert, damit nicht jeder Tastendruck eine Anfrage auslöst
    useEffect(() => {
        if (!query.trim()) {
            setPageResults([]);
            return;
        }
        const timer = setTimeout(() => {
            wikiApi.search(query).then(setPageResults).catch(console.error);
        }, SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [query]);

    const normalizedQuery = query.trim().toLowerCase();
    const hits: SearchHit[] = normalizedQuery
        ? [
              ...pageResults.map(result => ({
                  key: `page-${result.id}`,
                  icon: result.icon ?? '📄',
                  title: pageDisplayTitle(result),
                  snippetHtml: result.snippet,
                  kind: 'Seite',
                  url: `/wiki/${result.id}`,
              })),
              ...projects
                  .filter(project => project.name.toLowerCase().includes(normalizedQuery))
                  .map(project => ({
                      key: `project-${project.id}`,
                      icon: project.icon ?? '📁',
                      title: project.name,
                      kind: 'Projekt',
                      url: `/projects/${project.id}`,
                  })),
          ]
        : // Ohne Suchtext: die zuletzt geänderten Seiten
          [...pages]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 8)
              .map(page => ({ key: `page-${page.id}`, icon: page.icon ?? '📄', title: pageDisplayTitle(page), kind: 'Seite', url: `/wiki/${page.id}` }));

    const open = (hit: SearchHit | undefined) => {
        if (!hit) return;
        navigate(hit.url);
        onClose();
    };

    return (
        <Modal onClose={onClose} size="medium">
            <div className="search-dialog">
                <input
                    autoFocus
                    className="search-input"
                    placeholder="Seiten und Projekte durchsuchen …"
                    value={query}
                    onChange={event => {
                        setQuery(event.target.value);
                        setSelectedIndex(0);
                    }}
                    onKeyDown={event => {
                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setSelectedIndex(index => Math.min(index + 1, hits.length - 1));
                        } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setSelectedIndex(index => Math.max(index - 1, 0));
                        } else if (event.key === 'Enter') {
                            open(hits[selectedIndex]);
                        }
                    }}
                />
                <div className="search-results">
                    {!normalizedQuery && <div className="menu-heading">Zuletzt geändert</div>}
                    {normalizedQuery && hits.length === 0 && <p className="empty-state">Nichts gefunden</p>}
                    {hits.map((hit, index) => (
                        <button
                            key={hit.key}
                            className={`search-result ${index === selectedIndex ? 'is-active' : ''}`}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => open(hit)}
                        >
                            <span className="search-result-icon">{hit.icon}</span>
                            <span className="search-result-text">
                                <span className="search-result-title">{hit.title}</span>
                                {hit.snippetHtml && <span className="search-result-snippet" dangerouslySetInnerHTML={{ __html: hit.snippetHtml }} />}
                            </span>
                            <span className="search-result-kind">{hit.kind}</span>
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
