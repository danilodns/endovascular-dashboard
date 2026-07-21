'use client';

import { useState } from 'react';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';
import styles from './uploader.module.css';

interface UploaderProps {
  bucket: string;
  folder: string; // e.g. "company/123"
  onUploadSuccess: (url: string) => void;
  accept?: string;
  defaultUrl?: string | null;
}

export function Uploader({ bucket, folder, onUploadSuccess, accept = 'image/*', defaultUrl }: UploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(defaultUrl || null);
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Create a unique file path: folder/timestamp-originalName
      const timestamp = new Date().getTime();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${folder}/${timestamp}-${safeName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const url = publicData.publicUrl;
      setCurrentUrl(url);
      onUploadSuccess(url);
      toast.success('Arquivo enviado com sucesso!');
    } catch (err: any) {
      toast.error(`Falha no envio: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const isImage = currentUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || accept.includes('image');

  return (
    <div className={styles.uploaderWrapper}>
      {currentUrl ? (
        <div className={styles.previewContainer}>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="Preview" className={styles.previewImage} />
          ) : (
            <div className={styles.filePreview}>
              <File size={32} />
              <a href={currentUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                Visualizar documento
              </a>
            </div>
          )}
          
          <button 
            type="button" 
            className={styles.removeBtn}
            onClick={() => setCurrentUrl(null)}
            aria-label="Remover arquivo"
            title="Remover e enviar outro arquivo"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className={`${styles.dropzone} ${isUploading ? styles.uploading : ''}`}>
          <div className={styles.dropzoneContent}>
            {isUploading ? (
              <Loader2 className={styles.spinner} size={28} />
            ) : (
              <UploadCloud size={28} className={styles.uploadIcon} />
            )}
            <span className={styles.uploadText}>
              {isUploading ? 'Enviando...' : 'Clique para enviar ou arraste o arquivo'}
            </span>
            <span className={styles.uploadHint}>
              {accept.includes('image') ? 'PNG, JPG, WEBP, GIF até 5MB' : 'PDF até 10MB'}
            </span>
          </div>
          <input 
            type="file" 
            className={styles.fileInput} 
            accept={accept}
            onChange={handleFileChange}
            aria-label="Enviar arquivo"
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}
