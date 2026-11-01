import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  AttachmentCollectionContext,
  ActivePreviewCollection,
  type AttachmentCollectionItem,
} from './AttachmentCollectionContext';
export {
  AttachmentCollectionContext,
  ActivePreviewCollection,
  useOpeningCollection,
  type AttachmentCollectionItem,
} from './AttachmentCollectionContext';
import { ImageLightbox } from './ImageLightbox';
import { VideoLightbox } from './VideoLightbox';
import { createPortal } from 'react-dom';
import { PreviewHeader } from './PreviewChrome';
import { Spinner } from '@/components/ui/spinner';
const TextLightbox = lazy(() =>
  import('./TextLightbox').then((module) => ({ default: module.TextLightbox })),
);
import { ChatSessionFileProvider, useChatSessionFile } from './ChatSessionFileContext';
import { ImageGalleryContext } from './ImageGalleryContext';

/** Snapshot the opening collection and file origin. Live messages cannot retarget an open viewer. */
export function AttachmentCollectionPreview({
  items: openingItems,
  source,
  onClose,
  initial,
}: {
  items: readonly AttachmentCollectionItem[];
  source: string;
  onClose(): void;
  initial?: React.ReactNode;
}) {
  const [items] = useState(() => [...openingItems]);
  const [start] = useState(() =>
    Math.max(
      0,
      items.findIndex((item) => item.source === source),
    ),
  );
  const [index, setIndex] = useState(start);
  const fileContext = useChatSessionFile();
  const [origin] = useState(fileContext);
  const beforeLeave = useRef<((leave: () => void) => void) | null>(null);
  const item = items[index]!;
  const select = (next: number) => {
    if (next < 0 || next >= items.length || next === index) return;
    const leave = () => {
      beforeLeave.current = null;
      setIndex(next);
    };
    if (beforeLeave.current) beforeLeave.current(leave);
    else leave();
  };
  const selectRef = useRef(select);
  selectRef.current = select;
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || document.fullscreenElement) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"], video, audio, [role="menu"]'))
        return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      selectRef.current(index + (event.key === 'ArrowLeft' ? -1 : 1));
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [index]);
  return (
    <ChatSessionFileProvider value={origin}>
      <AttachmentCollectionContext.Provider value={null}>
        <ImageGalleryContext.Provider value={null}>
          <ActivePreviewCollection.Provider value={{ items, index, select, beforeLeave }}>
            <Suspense
              key={item.id}
              fallback={createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--surface)]">
                  <PreviewHeader name={item.name} onClose={onClose} />
                  <Spinner />
                </div>,
                document.body,
              )}
            >
              {index === start && initial ? (
                initial
              ) : item.media && item.kind === 'image' ? (
                <ImageLightbox
                  src={item.source}
                  filename={item.name}
                  {...item.image}
                  onClose={onClose}
                />
              ) : item.media && (item.kind === 'video' || item.kind === 'audio') ? (
                <VideoLightbox
                  src={item.source}
                  filename={item.name}
                  kind={item.kind}
                  onClose={onClose}
                />
              ) : (
                <TextLightbox filePath={item.source} fileName={item.name} onClose={onClose} />
              )}
            </Suspense>
          </ActivePreviewCollection.Provider>
        </ImageGalleryContext.Provider>
      </AttachmentCollectionContext.Provider>
    </ChatSessionFileProvider>
  );
}
