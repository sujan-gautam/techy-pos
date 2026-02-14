import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';
import {
    Plus, Download, Trash2, Pin, Save, Search,
    List, CheckCircle2, FileText, Bold, Code, Clock, Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import clsx from 'clsx';

const Notes = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        color: '#ffffff',
        isPinned: false
    });

    const textareaRef = useRef(null);

    const colors = [
        { name: 'White', value: '#ffffff' },
        { name: 'Slate', value: '#f8fafc' },
        { name: 'Blue', value: '#f0f7ff' },
        { name: 'Green', value: '#f0fdf4' },
        { name: 'Yellow', value: '#fffcf0' }
    ];

    const fetchNotes = async (selectId = null) => {
        try {
            const { data } = await api.get('/notes');
            if (Array.isArray(data)) {
                setNotes(data);
                if (selectId && selectId !== true) {
                    setSelectedNoteId(selectId);
                } else if (!selectedNoteId && data.length > 0) {
                    setSelectedNoteId(data[0]._id);
                }
            }
        } catch (error) {
            toast.error('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    useEffect(() => {
        if (selectedNoteId) {
            const note = notes.find(n => n._id === selectedNoteId);
            if (note) {
                setFormData({
                    title: note.title || '',
                    content: note.content || '',
                    color: note.color || '#ffffff',
                    isPinned: note.isPinned || false
                });
            }
        } else {
            setFormData({ title: '', content: '', color: '#ffffff', isPinned: false });
        }
    }, [selectedNoteId, notes]);

    const handleCreateNew = () => {
        setSelectedNoteId(null);
        setFormData({ title: '', content: '', color: '#ffffff', isPinned: false });
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    const handleSave = async () => {
        if (!formData.title.trim() && !formData.content.trim()) return;

        const payload = {
            title: formData.title.trim() || 'Untitled Note',
            content: formData.content || '',
            color: formData.color,
            isPinned: formData.isPinned
        };

        setIsSaving(true);
        try {
            if (selectedNoteId) {
                const { data } = await api.put(`/notes/${selectedNoteId}`, payload);
                setNotes(prev => prev.map(n => n._id === selectedNoteId ? data : n));
                toast.success('Saved');
            } else {
                const { data } = await api.post('/notes', payload);
                setNotes(prev => [data, ...prev]);
                setSelectedNoteId(data._id);
                toast.success('Note created');
            }
        } catch (error) {
            toast.error('Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/notes/${deleteModal.id}`);
            setNotes(prev => prev.filter(n => n._id !== deleteModal.id));
            if (selectedNoteId === deleteModal.id) setSelectedNoteId(null);
            toast.success('Note deleted');
        } catch (error) {
            toast.error('Delete failed');
        } finally {
            setDeleteModal({ isOpen: false, id: null });
        }
    };

    const insertAtCursor = (prefix, suffix = "") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        let start = textarea.selectionStart;
        let end = textarea.selectionEnd;
        const content = formData.content;

        if (suffix === "**" || suffix === "`") {
            if (start === end) {
                const before = content.substring(0, start);
                const after = content.substring(start);
                const startMatch = before.match(/\S+$/);
                const endMatch = after.match(/^\S+/);
                if (startMatch || endMatch) {
                    start -= startMatch ? startMatch[0].length : 0;
                    end += endMatch ? endMatch[0].length : 0;
                }
            }

            let selection = content.substring(start, end).trim();
            if (selection) {
                const needsSpaceBefore = start > 0 && !/\s/.test(content[start - 1]);
                const space = needsSpaceBefore ? " " : "";
                const replacement = space + prefix + selection + suffix;
                const newContent = content.substring(0, start) + replacement + content.substring(end);
                setFormData({ ...formData, content: newContent });
                return;
            }
        }

        const selected = content.substring(start, end);
        const replacement = prefix + selected + suffix;
        setFormData({ ...formData, content: content.substring(0, start) + replacement + content.substring(end) });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const textarea = e.target;
            const start = textarea.selectionStart;
            const content = formData.content;
            const lineStart = content.lastIndexOf('\n', start - 1) + 1;
            const currentLine = content.substring(lineStart, start);
            const listMatch = currentLine.match(/^(\s*)([•*]|\d+\.|\[ \])\s/);

            if (listMatch) {
                if (currentLine.trim() === listMatch[2]) {
                    e.preventDefault();
                    setFormData({ ...formData, content: content.substring(0, lineStart) + content.substring(start) });
                    return;
                }
                e.preventDefault();
                let nextSymbol = listMatch[2].includes('.') ? `${parseInt(listMatch[2]) + 1}. ` : `${listMatch[2]} `;
                insertAtCursor(`\n${listMatch[1]}${nextSymbol}`);
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
    };

    const downloadPDF = (note) => {
        if (!note) return;
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold").setFontSize(18).text(note.title || 'Untitled', 20, 20);
        doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(120).text(`Last updated: ${new Date(note.updatedAt).toLocaleString()}`, 20, 28);
        doc.setDrawColor(240).line(20, 32, 190, 32);
        doc.setFontSize(11).setTextColor(40);
        doc.text(doc.splitTextToSize(note.content || '', 170), 20, 40);
        doc.save(`${note.title || 'note'}.pdf`);
    };

    const filteredNotes = useMemo(() => {
        return notes
            .filter(n => (n.title + n.content).toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt));
    }, [notes, searchQuery]);

    if (loading) return (
        <div className="flex items-center justify-center h-[500px]">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white border border-slate-200 rounded-xl overflow-hidden relative shadow-sm">
            {/* Sidebar */}
            <div className="w-72 flex flex-col border-r border-slate-100 bg-slate-50/20">
                <div className="p-4 flex items-center justify-between bg-white border-b border-slate-100">
                    <span className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                        <FileText size={16} className="text-slate-400" />
                        Notes
                    </span>
                    <button onClick={handleCreateNew} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" title="New Note">
                        <Plus size={18} />
                    </button>
                </div>

                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-slate-400 rounded-lg text-xs outline-none transition-all placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
                    {filteredNotes.length > 0 ? filteredNotes.map(n => (
                        <button
                            key={n._id}
                            onClick={() => setSelectedNoteId(n._id)}
                            className={clsx(
                                "w-full text-left p-3 rounded-lg transition-all group relative border",
                                selectedNoteId === n._id ? "bg-white border-slate-200 shadow-sm" : "bg-transparent border-transparent hover:bg-slate-100/50"
                            )}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <span className={clsx("text-xs font-bold truncate flex-1", selectedNoteId === n._id ? "text-slate-900" : "text-slate-600")}>
                                    {n.title || "Untitled Note"}
                                </span>
                                {n.isPinned && <Pin size={10} className="text-slate-400 ml-2" fill="currentColor" />}
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mb-2">
                                {n.content || "No content..."}
                            </p>
                            <div className="flex items-center justify-between text-[9px] font-medium text-slate-300">
                                <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                                <Trash2 size={12} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDeleteClick(e, n._id)} />
                            </div>
                        </button>
                    )) : (
                        <div className="text-center py-10 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                            Empty
                        </div>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden" style={{ backgroundColor: formData.color }}>
                {/* Fixed Toolbar */}
                <div className="h-14 px-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex items-center justify-between z-10">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-slate-400">
                            <button onClick={() => insertAtCursor("\n• ")} className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md transition-all" title="Bullets"><List size={16} /></button>
                            <button onClick={() => insertAtCursor("\n1. ")} className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md transition-all text-[10px] font-bold">1.</button>
                            <button onClick={() => insertAtCursor("\n[ ] ")} className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md transition-all"><CheckCircle2 size={16} /></button>
                            <div className="w-px h-3 bg-slate-200 mx-1" />
                            <button onClick={() => insertAtCursor("**", "**")} className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md transition-all"><Bold size={16} /></button>
                            <button onClick={() => insertAtCursor("`", "`")} className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md transition-all"><Code size={16} /></button>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 border-l border-slate-100 pl-6">
                            {colors.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setFormData({ ...formData, color: c.value })}
                                    className={clsx(
                                        "w-5 h-5 rounded-full border transition-all flex items-center justify-center",
                                        formData.color === c.value ? "border-slate-800 scale-110 shadow-sm" : "border-slate-200 hover:border-slate-400"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                >
                                    {formData.color === c.value && <Check size={10} className="text-slate-800" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                            className={clsx(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                formData.isPinned ? "bg-slate-800 text-white border-slate-800" : "text-slate-400 border-slate-200 hover:bg-white"
                            )}
                        >
                            <Pin size={11} fill={formData.isPinned ? "white" : "none"} />
                            <span className="hidden md:inline">Pin</span>
                        </button>

                        <button onClick={() => downloadPDF(notes.find(n => n._id === selectedNoteId))} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
                            <Download size={18} />
                        </button>

                        <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2">
                            <Save size={14} />
                            {isSaving ? 'Saving' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Main Text Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto px-8 py-10 lg:px-16 lg:py-12">
                        <input
                            type="text"
                            placeholder="Note Title"
                            className="w-full text-4xl font-bold text-slate-900 border-none bg-transparent focus:outline-none focus:ring-0 p-0 mb-6 placeholder:text-slate-200"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        <textarea
                            ref={textareaRef}
                            className="w-full h-[calc(100vh-350px)] text-base text-slate-600 border-none bg-transparent focus:outline-none focus:ring-0 p-0 leading-relaxed resize-none placeholder:text-slate-200 font-medium"
                            placeholder="Start typing..."
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>
            </div>

            {/* Simple Delete Confirm */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[1px]">
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-100">
                        <div className="p-8 text-center">
                            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Note?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">This action cannot be undone.</p>
                        </div>
                        <div className="p-3 bg-slate-50 flex gap-2">
                            <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="flex-1 px-4 py-2 text-slate-500 font-bold text-xs uppercase hover:text-slate-700 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-500 text-white font-bold text-xs uppercase rounded-xl hover:bg-red-600 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notes;
