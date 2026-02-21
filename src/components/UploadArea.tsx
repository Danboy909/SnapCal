import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import clsx from 'clsx';

interface UploadAreaProps {
    onImageSelect: (base64: string) => void;
    className?: string;
}

export function UploadArea({ onImageSelect, className }: UploadAreaProps) {
    const [preview, setPreview] = useState<string | null>(null);

    const processFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setPreview(base64);
            onImageSelect(base64);
        };
        reader.readAsDataURL(file);
    }, [onImageSelect]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            processFile(acceptedFiles[0]);
        }
    }, [processFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    // Handle paste events
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) processFile(file);
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [processFile]);

    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onImageSelect('');
    };

    return (
        <div className={clsx('w-full', className)}>
            {!preview ? (
                <div
                    {...getRootProps()}
                    className={clsx(
                        "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[320px] group",
                        isDragActive
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02]"
                            : "premium-dashed-area hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-lg hover:shadow-blue-500/5"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className={clsx(
                        "w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors",
                        isDragActive ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500"
                    )}>
                        <Upload className="w-8 h-8" />
                    </div>
                    <p className="text-xl font-medium text-slate-700 dark:text-slate-200 mb-2">
                        {isDragActive ? "Drop to upload" : "Drag & drop an image here"}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 font-normal">or paste from clipboard</p>
                    <button className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 font-medium shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-700 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Select File
                    </button>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black/5 group">
                    <img
                        src={preview}
                        alt="Uploaded event"
                        className="w-full max-h-[500px] object-contain mx-auto"
                    />
                    <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 bg-white/90 px-4 py-2 rounded-lg font-medium text-slate-900 pointer-events-auto cursor-pointer shadow-lg" {...getRootProps()}>
                            Replace Image
                            <input {...getInputProps()} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
