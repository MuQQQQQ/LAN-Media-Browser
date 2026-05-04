import { useState } from 'react';

export default function TagGroupList({ tagsTree, selectedTagIds = [], onToggleTag, displayMode = 'collapsed', limit = 12, recentHighlight = true }) {
    const [expanded, setExpanded] = useState({});
    return (
        <div className="tag-groups">
            {tagsTree.map((category) => {
                const isExpanded = expanded[category.id] ?? displayMode === 'expanded';
                const visibleTags = isExpanded ? category.children : category.children.slice(0, limit);
                return (
                    <div className="tag-group" key={category.id}>
                        <strong>{category.name}</strong>
                        <div className="chips">
                            {visibleTags.map((tag) => {
                                const selected = selectedTagIds.includes(tag.id);
                                const recent = recentHighlight && tag.lastUsedAt;
                                return <button key={tag.id} className={`${selected ? 'chip active' : 'chip'} ${recent ? 'recent' : ''}`} onClick={() => onToggleTag?.(tag.id)}>{tag.name}</button>;
                            })}
                        </div>
                        {category.children.length > limit && <button className="link-button" onClick={() => setExpanded((x) => ({ ...x, [category.id]: !isExpanded }))}>{isExpanded ? 'Show less' : `Show more (${category.children.length - limit})`}</button>}
                    </div>
                );
            })}
        </div>
    );
}