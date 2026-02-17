'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  demoEmails,
  demoContacts,
  getContactByEmail,
  formatEmailDate,
  type Email,
  type Contact,
  type FolderType,
} from '@/data/email-demo-data';

// ============================================================================
// Types
// ============================================================================

type SortField = 'date' | 'sender' | 'subject';
type SortDir = 'asc' | 'desc';
type FilterType = 'all' | 'unread' | 'starred' | 'attachments' | 'high-priority';

// ============================================================================
// Icons (inline SVG components)
// ============================================================================

function Icon({ d, className = 'w-5 h-5', stroke = true }: { d: string; className?: string; stroke?: boolean }) {
  return (
    <svg className={className} fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={stroke ? 1.5 : undefined}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const icons = {
  inbox: 'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z',
  sent: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  drafts: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  archive: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  spam: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  attach: 'M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13',
  compose: 'M12 4.5v15m7.5-7.5h-15',
  chevronDown: 'M19.5 8.25l-7.5 7.5-7.5-7.5',
  filter: 'M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z',
  reply: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
  forward: 'M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3',
  check: 'M4.5 12.75l6 6 9-13.5',
  user: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  userPlus: 'M19 7.5v3m3-3h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z',
  phone: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  building: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  mail: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  newsletter: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z',
  tag: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  deal: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  markRead: 'M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51',
  x: 'M6 18L18 6M6 6l12 12',
  sortAsc: 'M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12',
  sortDesc: 'M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25',
};

// ============================================================================
// Avatar Component
// ============================================================================

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
  ];
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };

  return (
    <div className={`${sizes[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ============================================================================
// Compose Modal
// ============================================================================

function ComposeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-primary-900 rounded-t-xl text-white">
          <h3 className="font-semibold">Nieuw bericht</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <Icon d={icons.x} className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-0">
          <div className="border-b">
            <div className="flex items-center px-5 py-2 border-b">
              <span className="text-sm text-gray-500 w-16">Aan:</span>
              <input type="email" className="flex-1 outline-none text-sm" placeholder="email@voorbeeld.nl" />
            </div>
            <div className="flex items-center px-5 py-2 border-b">
              <span className="text-sm text-gray-500 w-16">CC:</span>
              <input type="email" className="flex-1 outline-none text-sm" placeholder="" />
            </div>
            <div className="flex items-center px-5 py-2">
              <span className="text-sm text-gray-500 w-16">Onderwerp:</span>
              <input type="text" className="flex-1 outline-none text-sm font-medium" placeholder="Onderwerp" />
            </div>
          </div>
          <textarea
            className="w-full p-5 text-sm outline-none resize-none min-h-[300px]"
            placeholder="Schrijf je bericht..."
          />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50 rounded-b-xl">
          <div className="flex items-center gap-2">
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              Versturen
            </button>
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
              <Icon d={icons.attach} className="w-5 h-5" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
            <Icon d={icons.trash} className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Folder Sidebar
// ============================================================================

function FolderSidebar({
  currentFolder,
  onFolderChange,
  folderCounts,
  onCompose,
}: {
  currentFolder: FolderType;
  onFolderChange: (f: FolderType) => void;
  folderCounts: Record<FolderType, number>;
  onCompose: () => void;
}) {
  const folders: { id: FolderType; name: string; icon: string }[] = [
    { id: 'inbox', name: 'Inbox', icon: icons.inbox },
    { id: 'sent', name: 'Verzonden', icon: icons.sent },
    { id: 'drafts', name: 'Concepten', icon: icons.drafts },
    { id: 'archive', name: 'Archief', icon: icons.archive },
    { id: 'spam', name: 'Spam', icon: icons.spam },
    { id: 'trash', name: 'Prullenbak', icon: icons.trash },
  ];

  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50/80 flex flex-col">
      {/* Compose button */}
      <div className="p-3">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2.5 font-medium text-sm transition-colors shadow-sm"
        >
          <Icon d={icons.compose} className="w-4 h-4" />
          Nieuw bericht
        </button>
      </div>

      {/* Folders */}
      <nav className="flex-1 px-2 pb-4 space-y-0.5">
        {folders.map((folder) => {
          const isActive = currentFolder === folder.id;
          const count = folderCounts[folder.id];
          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-800 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon d={folder.icon} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              <span className="flex-1 text-left">{folder.name}</span>
              {count > 0 && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Labels section */}
      <div className="border-t border-gray-200 p-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Labels</h4>
        <div className="space-y-1">
          {[
            { name: 'Offerte', color: 'bg-blue-400' },
            { name: 'Hoge prioriteit', color: 'bg-red-400' },
            { name: 'Klant', color: 'bg-emerald-400' },
            { name: 'Leverancier', color: 'bg-amber-400' },
            { name: 'Montage', color: 'bg-violet-400' },
          ].map((label) => (
            <div key={label.name} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
              <span className={`w-2.5 h-2.5 rounded-full ${label.color}`} />
              {label.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Email List
// ============================================================================

function EmailList({
  emails,
  selectedId,
  onSelect,
  onToggleStar,
  onToggleRead,
  sortField,
  sortDir,
  onSort,
  filter,
  onFilter,
  searchQuery,
  onSearchChange,
  currentFolder,
}: {
  emails: Email[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onToggleRead: (id: string) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  filter: FilterType;
  onFilter: (f: FilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentFolder: FolderType;
}) {
  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Alle' },
    { id: 'unread', label: 'Ongelezen' },
    { id: 'starred', label: 'Met ster' },
    { id: 'attachments', label: 'Bijlagen' },
    { id: 'high-priority', label: 'Belangrijk' },
  ];

  const folderNames: Record<FolderType, string> = {
    inbox: 'Inbox', sent: 'Verzonden', drafts: 'Concepten',
    archive: 'Archief', trash: 'Prullenbak', spam: 'Spam',
  };

  return (
    <div className="w-[380px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
      {/* Search & Folder Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">{folderNames[currentFolder]}</h2>
          <span className="text-xs text-gray-500">{emails.length} berichten</span>
        </div>
        <div className="relative">
          <Icon d={icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoeken in emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        {/* Sort toggle */}
        <div className="ml-auto flex items-center">
          <button
            onClick={() => onSort(sortField)}
            className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400"
            title={`Sorteren op ${sortField} (${sortDir === 'asc' ? 'oplopend' : 'aflopend'})`}
          >
            <Icon d={sortDir === 'asc' ? icons.sortAsc : icons.sortDesc} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sort options row */}
      <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500">
        <span>Sorteer:</span>
        {(['date', 'sender', 'subject'] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => onSort(field)}
            className={`px-1.5 py-0.5 rounded ${
              sortField === field ? 'text-primary-700 font-medium' : 'hover:text-gray-700'
            }`}
          >
            {{ date: 'Datum', sender: 'Afzender', subject: 'Onderwerp' }[field]}
          </button>
        ))}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <Icon d={icons.inbox} className="w-12 h-12 mb-3" />
            <p className="text-sm">Geen emails gevonden</p>
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = email.id === selectedId;
            const displayName = currentFolder === 'sent' || currentFolder === 'drafts'
              ? email.to[0]?.name || email.to[0]?.email
              : email.from.name;
            return (
              <div
                key={email.id}
                onClick={() => onSelect(email.id)}
                className={`px-3 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary-50 border-l-2 border-l-primary-500'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    {!email.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                    {email.read && <span className="w-2.5 h-2.5 flex-shrink-0" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {displayName}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatEmailDate(email.date)}
                      </span>
                    </div>
                    <div className={`text-sm truncate mb-0.5 ${!email.read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {email.subject}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{email.preview}</div>

                    {/* Bottom row: labels, attachment, star */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {email.labels.slice(0, 2).map((label) => (
                        <span
                          key={label}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            label === 'hoge prioriteit' || label === 'urgent' || label === 'klacht'
                              ? 'bg-red-100 text-red-700'
                              : label === 'offerte'
                              ? 'bg-blue-100 text-blue-700'
                              : label === 'goedgekeurd'
                              ? 'bg-emerald-100 text-emerald-700'
                              : label === 'leverancier' || label === 'bestelling'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                      <div className="flex-1" />
                      {email.hasAttachment && (
                        <Icon d={icons.attach} className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      {email.priority === 'high' && (
                        <span className="text-red-400 text-[10px]">!</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleStar(email.id); }}
                        className={`transition-colors ${email.starred ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
                      >
                        <svg className="w-4 h-4" fill={email.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={icons.star} />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Contact Sidebar (Right - Pipedrive style)
// ============================================================================

function ContactSidebar({
  contact,
  email,
  onAddCustomer,
  onSubscribeNewsletter,
}: {
  contact: Contact | null;
  email: Email;
  onAddCustomer: (contactEmail: string) => void;
  onSubscribeNewsletter: (contactEmail: string) => void;
}) {
  const senderEmail = email.from.email;
  const senderName = email.from.name;
  const senderCompany = email.from.company;

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-gray-200 bg-gray-50/50 overflow-y-auto">
      <div className="p-4">
        {/* Contact Header */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <Avatar name={senderName} size="lg" />
          </div>
          <h3 className="font-semibold text-gray-900">{senderName}</h3>
          <p className="text-sm text-gray-500">{senderEmail}</p>
          {senderCompany && (
            <p className="text-sm text-gray-600 mt-0.5 flex items-center justify-center gap-1">
              <Icon d={icons.building} className="w-3.5 h-3.5" />
              {senderCompany}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 mb-4">
          {(!contact || !contact.isCustomer) && (
            <button
              onClick={() => onAddCustomer(senderEmail)}
              className="w-full flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shadow-sm"
            >
              <Icon d={icons.userPlus} className="w-4 h-4" />
              Toevoegen aan klanten
            </button>
          )}
          {contact?.isCustomer && (
            <div className="flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 rounded-lg px-4 py-2 text-sm font-medium">
              <Icon d={icons.check} className="w-4 h-4" />
              Klant in bestand
            </div>
          )}
          {(!contact || !contact.subscribedNewsletter) && (
            <button
              onClick={() => onSubscribeNewsletter(senderEmail)}
              className="w-full flex items-center justify-center gap-2 border border-primary-300 text-primary-700 hover:bg-primary-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Icon d={icons.newsletter} className="w-4 h-4" />
              Abonneren nieuwsbrief
            </button>
          )}
          {contact?.subscribedNewsletter && (
            <div className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 rounded-lg px-4 py-2 text-sm">
              <Icon d={icons.check} className="w-4 h-4" />
              Geabonneerd op nieuwsbrief
            </div>
          )}
        </div>

        {/* Contact details */}
        {contact && (
          <>
            {/* Phone */}
            {contact.phone && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</h4>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Icon d={icons.phone} className="w-4 h-4 text-gray-400" />
                  {contact.phone}
                </div>
              </div>
            )}

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tag === 'klant' ? 'bg-emerald-100 text-emerald-700'
                          : tag === 'prospect' ? 'bg-blue-100 text-blue-700'
                          : tag === 'leverancier' ? 'bg-amber-100 text-amber-700'
                          : tag === 'klacht' ? 'bg-red-100 text-red-700'
                          : tag === 'partner' ? 'bg-violet-100 text-violet-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Deals (Pipedrive-style) */}
            {contact.deals && contact.deals.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deals</h4>
                <div className="space-y-2">
                  {contact.deals.map((deal, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{deal.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary-700">{deal.value}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          deal.status === 'won' ? 'bg-emerald-100 text-emerald-700'
                            : deal.status === 'open' ? 'bg-blue-100 text-blue-700'
                            : deal.status === 'pending' ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {{ won: 'Gewonnen', open: 'Open', pending: 'In afwachting', lost: 'Verloren' }[deal.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity timeline */}
            {contact.activities && contact.activities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Activiteiten</h4>
                <div className="space-y-0">
                  {contact.activities.map((activity, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        activity.type === 'email' ? 'bg-blue-100 text-blue-500'
                          : activity.type === 'call' ? 'bg-emerald-100 text-emerald-500'
                          : 'bg-violet-100 text-violet-500'
                      }`}>
                        <Icon
                          d={activity.type === 'email' ? icons.mail : activity.type === 'call' ? icons.phone : icons.clock}
                          className="w-3 h-3"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-700">{activity.description}</p>
                        <p className="text-[10px] text-gray-400">{new Date(activity.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notities</h4>
                <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-2.5">{contact.notes}</p>
              </div>
            )}

            {/* Customer since */}
            {contact.addedDate && (
              <div className="text-[10px] text-gray-400 text-center mt-4 pt-3 border-t border-gray-200">
                In bestand sinds {new Date(contact.addedDate).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
              </div>
            )}
          </>
        )}

        {/* No contact found - show add prompt */}
        {!contact && (
          <div className="text-center py-4">
            <div className="bg-amber-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-amber-700 font-medium">Nieuw contact</p>
              <p className="text-[10px] text-amber-600 mt-1">
                Dit emailadres is nog niet bekend in uw klantenbestand.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Email Detail View
// ============================================================================

function EmailDetail({
  email,
  onToggleStar,
  onToggleRead,
  onArchive,
  onDelete,
}: {
  email: Email;
  onToggleStar: (id: string) => void;
  onToggleRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
      {/* Email Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        {/* Actions bar */}
        <div className="flex items-center gap-1 mb-4">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon d={icons.reply} className="w-4 h-4" />
            Beantwoorden
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon d={icons.forward} className="w-4 h-4" />
            Doorsturen
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => onArchive(email.id)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Archiveren"
          >
            <Icon d={icons.archive} className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Verwijderen"
          >
            <Icon d={icons.trash} className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleRead(email.id)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={email.read ? 'Markeer als ongelezen' : 'Markeer als gelezen'}
          >
            <Icon d={icons.markRead} className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStar(email.id)}
            className={`p-1.5 rounded-lg transition-colors ${email.starred ? 'text-amber-400' : 'text-gray-400 hover:text-amber-300'}`}
            title={email.starred ? 'Ster verwijderen' : 'Ster toevoegen'}
          >
            <svg className="w-4 h-4" fill={email.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icons.star} />
            </svg>
          </button>
        </div>

        {/* Subject & labels */}
        <div className="flex items-start gap-3">
          <h1 className="text-lg font-semibold text-gray-900 flex-1">{email.subject}</h1>
          {email.priority === 'high' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex-shrink-0">
              Hoge prioriteit
            </span>
          )}
        </div>

        {/* Labels */}
        {email.labels.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {email.labels.map((label) => (
              <span
                key={label}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  label === 'hoge prioriteit' || label === 'urgent' || label === 'klacht'
                    ? 'bg-red-100 text-red-700'
                    : label === 'offerte'
                    ? 'bg-blue-100 text-blue-700'
                    : label === 'goedgekeurd'
                    ? 'bg-emerald-100 text-emerald-700'
                    : label === 'leverancier' || label === 'bestelling'
                    ? 'bg-amber-100 text-amber-700'
                    : label === 'montage' || label === 'planning'
                    ? 'bg-violet-100 text-violet-700'
                    : label === 'vergunning' || label === 'gemeente'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* From/To */}
        <div className="flex items-center gap-3 mt-4">
          <Avatar name={email.from.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{email.from.name}</span>
              <span className="text-xs text-gray-400">&lt;{email.from.email}&gt;</span>
            </div>
            <div className="text-xs text-gray-500">
              Aan: {email.to.map((t) => t.name || t.email).join(', ')}
              {email.cc && email.cc.length > 0 && (
                <span> | CC: {email.cc.map((c) => c.name || c.email).join(', ')}</span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400 flex-shrink-0">
            {new Date(email.date).toLocaleDateString('nl-NL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-w-3xl">
          {email.body}
        </div>

        {/* Attachments */}
        {email.hasAttachment && email.attachments && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {email.attachments.length} bijlage{email.attachments.length > 1 ? 'n' : ''}
            </h4>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${
                    att.type === 'pdf' ? 'bg-red-500'
                      : att.type === 'image' ? 'bg-emerald-500'
                      : att.type === 'ai' ? 'bg-orange-500'
                      : 'bg-gray-500'
                  }`}>
                    {att.type === 'pdf' ? 'PDF' : att.type === 'image' ? 'IMG' : att.type === 'ai' ? 'AI' : 'DOC'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{att.name}</p>
                    <p className="text-[10px] text-gray-400">{att.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick reply */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Snel antwoorden..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Verstuur
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon d={icons.mail} className="w-10 h-10 text-gray-300" />
      </div>
      <p className="text-lg font-medium text-gray-500 mb-1">Selecteer een email</p>
      <p className="text-sm text-gray-400">Kies een bericht uit de lijst om te lezen</p>
    </div>
  );
}

// ============================================================================
// Main EmailClient Component
// ============================================================================

export default function EmailClient() {
  // State
  const [emails, setEmails] = useState<Email[]>(demoEmails);
  const [contacts, setContacts] = useState<Contact[]>(demoContacts);
  const [currentFolder, setCurrentFolder] = useState<FolderType>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Show notification
  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<FolderType, number> = {
      inbox: 0, sent: 0, drafts: 0, archive: 0, trash: 0, spam: 0,
    };
    emails.forEach((e) => {
      if (!e.read) counts[e.folder]++;
    });
    // Always show draft count (total, not just unread)
    counts.drafts = emails.filter((e) => e.folder === 'drafts').length;
    return counts;
  }, [emails]);

  // Filtered & sorted emails
  const visibleEmails = useMemo(() => {
    let result = emails.filter((e) => e.folder === currentFolder);

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.from.name.toLowerCase().includes(q) ||
          e.from.email.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q) ||
          (e.from.company && e.from.company.toLowerCase().includes(q))
      );
    }

    // Filter
    switch (filter) {
      case 'unread':
        result = result.filter((e) => !e.read);
        break;
      case 'starred':
        result = result.filter((e) => e.starred);
        break;
      case 'attachments':
        result = result.filter((e) => e.hasAttachment);
        break;
      case 'high-priority':
        result = result.filter((e) => e.priority === 'high');
        break;
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'sender':
          cmp = a.from.name.localeCompare(b.from.name);
          break;
        case 'subject':
          cmp = a.subject.localeCompare(b.subject);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [emails, currentFolder, searchQuery, filter, sortField, sortDir]);

  // Selected email
  const selectedEmail = useMemo(
    () => emails.find((e) => e.id === selectedEmailId) || null,
    [emails, selectedEmailId]
  );

  // Contact for selected email
  const selectedContact = useMemo(() => {
    if (!selectedEmail) return null;
    const contactEmail = selectedEmail.folder === 'sent' || selectedEmail.folder === 'drafts'
      ? selectedEmail.to[0]?.email
      : selectedEmail.from.email;
    return contacts.find((c) => c.email === contactEmail) || null;
  }, [selectedEmail, contacts]);

  // Handlers
  const handleSelectEmail = useCallback((id: string) => {
    setSelectedEmailId(id);
    // Mark as read
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read: true } : e))
    );
  }, []);

  const handleToggleStar = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
    );
  }, []);

  const handleToggleRead = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read: !e.read } : e))
    );
  }, []);

  const handleArchive = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, folder: 'archive' as FolderType } : e))
    );
    setSelectedEmailId(null);
    showNotification('Email gearchiveerd');
  }, [showNotification]);

  const handleDelete = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, folder: 'trash' as FolderType } : e))
    );
    setSelectedEmailId(null);
    showNotification('Email verwijderd');
  }, [showNotification]);

  const handleFolderChange = useCallback((folder: FolderType) => {
    setCurrentFolder(folder);
    setSelectedEmailId(null);
    setFilter('all');
    setSearchQuery('');
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const handleAddCustomer = useCallback((contactEmail: string) => {
    setContacts((prev) => {
      const existing = prev.find((c) => c.email === contactEmail);
      if (existing) {
        return prev.map((c) =>
          c.email === contactEmail ? { ...c, isCustomer: true } : c
        );
      }
      // Find email to get contact info
      const email = emails.find(
        (e) => e.from.email === contactEmail || e.to.some((t) => t.email === contactEmail)
      );
      if (!email) return prev;
      const addr = email.from.email === contactEmail ? email.from : email.to.find((t) => t.email === contactEmail);
      if (!addr) return prev;
      return [
        ...prev,
        {
          id: `c${Date.now()}`,
          name: addr.name,
          email: addr.email,
          company: addr.company,
          isCustomer: true,
          subscribedNewsletter: false,
          tags: ['klant', 'nieuw'],
          addedDate: new Date().toISOString().split('T')[0],
        },
      ];
    });
    showNotification('Contact toegevoegd aan klantenbestand!');
  }, [emails, showNotification]);

  const handleSubscribeNewsletter = useCallback((contactEmail: string) => {
    setContacts((prev) => {
      const existing = prev.find((c) => c.email === contactEmail);
      if (existing) {
        return prev.map((c) =>
          c.email === contactEmail ? { ...c, subscribedNewsletter: true } : c
        );
      }
      const email = emails.find(
        (e) => e.from.email === contactEmail || e.to.some((t) => t.email === contactEmail)
      );
      if (!email) return prev;
      const addr = email.from.email === contactEmail ? email.from : email.to.find((t) => t.email === contactEmail);
      if (!addr) return prev;
      return [
        ...prev,
        {
          id: `c${Date.now()}`,
          name: addr.name,
          email: addr.email,
          company: addr.company,
          isCustomer: false,
          subscribedNewsletter: true,
          tags: ['nieuwsbrief'],
          addedDate: new Date().toISOString().split('T')[0],
        },
      ];
    });
    showNotification('Contact geabonneerd op nieuwsbrief!');
  }, [emails, showNotification]);

  return (
    <div className="flex h-full bg-white relative">
      {/* Notification toast */}
      {notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {notification}
        </div>
      )}

      {/* Folder Sidebar */}
      <FolderSidebar
        currentFolder={currentFolder}
        onFolderChange={handleFolderChange}
        folderCounts={folderCounts}
        onCompose={() => setShowCompose(true)}
      />

      {/* Email List */}
      <EmailList
        emails={visibleEmails}
        selectedId={selectedEmailId}
        onSelect={handleSelectEmail}
        onToggleStar={handleToggleStar}
        onToggleRead={handleToggleRead}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        filter={filter}
        onFilter={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentFolder={currentFolder}
      />

      {/* Email Detail + Contact Sidebar */}
      {selectedEmail ? (
        <>
          <EmailDetail
            email={selectedEmail}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
          <ContactSidebar
            contact={selectedContact}
            email={selectedEmail}
            onAddCustomer={handleAddCustomer}
            onSubscribeNewsletter={handleSubscribeNewsletter}
          />
        </>
      ) : (
        <EmptyState />
      )}

      {/* Compose Modal */}
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}
    </div>
  );
}
