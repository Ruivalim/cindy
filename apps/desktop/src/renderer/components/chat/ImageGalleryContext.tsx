/** Explicit ordered images supplied by the opening message, draft or file list.
 * Portals retain this scope; no viewer scans the DOM or a whole session history.
 * Annotation metadata travels with each image so switching keeps editable strokes.
 */
import { createContext } from 'react';
import type { AnnotationStroke } from './lightboxAnnotations';

/** 会话画廊里的一张图:src 为渲染所用 URL(标注图 = 烧录图)。 */
export interface GalleryImage {
  src: string;
  /**
   * Optional stable identity for images rendered outside the host DOM, such as
   * plugin card iframe images. It disambiguates repeated URLs when opening the
   * conversation gallery from one of those images.
   */
  galleryId?: string;
  /** 烧录标注图的未烧录原图 URL(与 ImageRef.annotationSourceUrl 同源)。 */
  annotationSourceUrl?: string;
  /** 持久化的矢量笔迹;与 annotationSourceUrl 成对出现才有意义。 */
  annotationStrokes?: readonly AnnotationStroke[];
}

/** Opening surface collection. Without a provider the viewer shows only its source. */
export const ImageGalleryContext = createContext<readonly GalleryImage[] | null>(null);
