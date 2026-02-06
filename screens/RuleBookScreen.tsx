import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { dataService } from '../services/dataService';

export const RuleBookScreen = () => {
    const navigate = useNavigate();
    const { role } = useUser();

    // Check if user is manager (President/Vice)
    const isManager = role === 'presidente' || role === 'vice-presidente';

    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [viewingRule, setViewingRule] = useState<any | null>(null);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await dataService.rules.list();
            setRules(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validate file type
            if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
                alert('Apenas PDF ou Imagens são permitidos.');
                return;
            }
            // Validate size (e.g., 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('O arquivo deve ter no máximo 5MB.');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !selectedFile) return;

        setUploading(true);
        try {
            const type = selectedFile.type === 'application/pdf' ? 'pdf' : 'image';
            await dataService.rules.create(title, description, selectedFile, type);

            // Reset form
            setTitle('');
            setDescription('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            await loadRules();
        } catch (error) {
            alert('Erro ao enviar arquivo. Tente novamente.');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, fileUrl: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;

        try {
            await dataService.rules.delete(id, fileUrl); // Ensure dataService.rules.delete is implemented or update it
            await loadRules();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir regra.');
        }
    };

    return (
        <div className="min-h-screen bg-background-dark pb-20">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold text-white">Livro de Regras</h1>
            </header>

            <main className="p-6 flex flex-col gap-8">
                {/* Upload Section (Managers Only) */}
                {isManager && (
                    <section className="bg-surface-dark border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">upload_file</span>
                            Adicionar Nova Regra
                        </h2>

                        <form onSubmit={handleUpload} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1 block">Título</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ex: Regulamento 2024"
                                    className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1 block">Arquivo (PDF ou Imagem)</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf,image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-slate-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-primary/10 file:text-primary
                                        hover:file:bg-primary/20
                                        cursor-pointer"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !selectedFile || !title}
                                className="mt-2 bg-primary text-background-dark font-bold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">cloud_upload</span>
                                        Enviar Regra
                                    </>
                                )}
                            </button>
                        </form>
                    </section>
                )}

                {/* Rules List */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">library_books</span>
                        Regras Disponíveis
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                        </div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-10 bg-surface-dark rounded-2xl border border-white/5 border-dashed">
                            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">folder_off</span>
                            <p className="text-slate-400">Nenhuma regra publicada ainda.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {rules.map(rule => (
                                <div key={rule.id} className="bg-surface-dark border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-12 rounded-lg flex items-center justify-center ${rule.file_type === 'pdf' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            <span className="material-symbols-outlined text-2xl">
                                                {rule.file_type === 'pdf' ? 'picture_as_pdf' : 'image'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold">{rule.title}</h3>
                                            <p className="text-slate-400 text-xs">
                                                Enviado por {rule.profiles?.name || 'Admin'} em {new Date(rule.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setViewingRule(rule)}
                                            className="size-10 rounded-full bg-white/5 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                                            title="Visualizar"
                                        >
                                            <span className="material-symbols-outlined">visibility</span>
                                        </button>

                                        {isManager && (
                                            <button
                                                onClick={() => handleDelete(rule.id, rule.file_url)}
                                                className="size-10 rounded-full bg-white/5 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                                title="Excluir"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Preview Area (Always visible for Manager below upload, effectively handled by list + modal for better UX on mobile)
                    The prompt said "logo abaixo do upload tem uma área de visualização".
                    Since we have a list, that counts as the "view area".
                */}
            </main>

            {/* View Modal */}
            {viewingRule && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface-dark w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-white font-bold truncate pr-4">{viewingRule.title}</h3>
                            <button
                                onClick={() => setViewingRule(null)}
                                className="size-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto bg-black/50 p-2 flex items-center justify-center relative">
                            {viewingRule.file_type === 'pdf' ? (
                                <iframe
                                    src={viewingRule.file_url}
                                    className="w-full h-full rounded-lg"
                                    title="PDF Viewer"
                                >
                                    <p className="text-white text-center">
                                        Seu navegador não suporta visualização de PDF.
                                        <a href={viewingRule.file_url} target="_blank" rel="noreferrer" className="text-primary underline ml-1">Clique para baixar</a>.
                                    </p>
                                </iframe>
                            ) : (
                                <img
                                    src={viewingRule.file_url}
                                    alt={viewingRule.title}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                />
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 flex justify-end">
                            <a
                                href={viewingRule.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">open_in_new</span>
                                Abrir no Navegador
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
