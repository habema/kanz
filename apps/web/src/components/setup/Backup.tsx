import { useState } from 'react';
import { migrateConfig, type GameConfig } from '@kanz/game-core';
import { Download, FileUp } from 'lucide-react';
import { outlineButton } from '@/components/ui';
import { FilePick, download } from './shared';

// The whole game as one JSON file, to keep or to move to another install.
// Restoring replaces everything in the draft.
export function BackupButtons({ draft, onRestore }: { draft: GameConfig; onRestore: (config: GameConfig) => void }) {
  return (
    <>
      <button
        type="button"
        onClick={() =>
          download(`${draft.title.trim() || 'quiz'}.json`, JSON.stringify(draft, null, 2), 'application/json')
        }
        title="تنزيل كل الإعداد في ملف واحد"
        className={outlineButton}
      >
        <Download size={14} /> نسخة احتياطية
      </button>
      <RestoreButton onRestore={onRestore} />
    </>
  );
}

export function RestoreButton({ onRestore }: { onRestore: (config: GameConfig) => void }) {
  const [failed, setFailed] = useState<string | null>(null);
  const restore = async (file: File) => {
    setFailed(null);
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.categories) || !Array.isArray(data.teams))
        throw new Error('ليس ملف نسخة احتياطية');
      if (!window.confirm('استبدال كل الإعداد الحالي بالنسخة الاحتياطية؟')) return;
      onRestore(migrateConfig(data));
    } catch (error) {
      setFailed(`تعذّرت قراءة الملف: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  return (
    <>
      <FilePick accept=".json" onFile={(file) => void restore(file)} testId="input-restore">
        <FileUp size={14} /> استعادة نسخة
      </FilePick>
      {failed && <span className="w-full text-xs text-[#ffadc2]">{failed}</span>}
    </>
  );
}
