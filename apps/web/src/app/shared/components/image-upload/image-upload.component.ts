import { Component, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'gonok-image-upload',
  standalone: true,
  template: `
    <div class="upload-zone" [class.upload-zone--has-image]="currentUrl() || previewSrc()"
         (dragover)="onDragOver($event)" (dragleave)="dragging.set(false)" (drop)="onDrop($event)"
         [class.upload-zone--dragging]="dragging()">

      @if (currentUrl() || previewSrc()) {
        <div class="upload-preview">
          <img [src]="previewSrc() || currentUrl()" [alt]="label()" />
          <div class="upload-preview__overlay">
            <button class="btn btn--sm" type="button" (click)="fileInput.click()">Change</button>
            <button class="btn btn--sm btn--danger" type="button" (click)="removeImage()">Remove</button>
          </div>
        </div>
      } @else {
        <div class="upload-placeholder" (click)="fileInput.click()">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2"/>
          </svg>
          <span class="upload-text">{{ label() }}</span>
          <span class="upload-hint">Click or drag image here (max 5MB)</span>
        </div>
      }

      @if (uploading()) {
        <div class="upload-progress">
          <div class="upload-progress__bar"></div>
          <span>Uploading...</span>
        </div>
      }

      @if (error()) {
        <p class="form-error">{{ error() }}</p>
      }
    </div>

    <input #fileInput type="file" accept="image/jpeg,image/png,image/webp,image/gif"
           (change)="onFileSelected($event)" style="display:none" />
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .upload-zone {
      border: 2px dashed $color-border;
      border-radius: $radius-lg;
      overflow: hidden;
      transition: border-color $transition-fast;
      position: relative;

      &--dragging {
        border-color: $color-primary;
        background: rgba($color-primary, 0.04);
      }

      &--has-image {
        border-style: solid;
      }
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: $space-2;
      padding: $space-6 $space-4;
      cursor: pointer;
      color: $color-text-secondary;
      transition: color $transition-fast;

      &:hover {
        color: $color-primary;
      }
    }

    .upload-icon {
      width: 32px;
      height: 32px;
    }

    .upload-text {
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
    }

    .upload-hint {
      font-size: 12px;
      opacity: 0.7;
    }

    .upload-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      max-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: $color-gray-50;

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      &__overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $space-2;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity $transition-fast;
      }

      &:hover .upload-preview__overlay {
        opacity: 1;
      }
    }

    .upload-progress {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: $space-2;
      background: rgba(255, 255, 255, 0.9);
      font-size: $font-size-sm;
      color: $color-text-secondary;

      &__bar {
        width: 60%;
        height: 4px;
        background: $color-gray-200;
        border-radius: 2px;
        overflow: hidden;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: $color-primary;
          animation: progress-indeterminate 1.5s ease-in-out infinite;
        }
      }
    }

    @keyframes progress-indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }

    .form-error {
      padding: $space-2 $space-3;
      margin: 0;
    }
  `,
})
export class ImageUploadComponent {
  private http = inject(HttpClient);

  /** Label shown in the upload placeholder */
  label = input('Upload Image');

  /** S3 folder name: 'products', 'business-logos', 'profile' */
  folder = input<string>('general');

  /** Current image URL (for edit mode) */
  currentUrl = input<string | null>(null);

  /** Emits the CDN URL after successful upload */
  uploaded = output<string>();

  /** Emits when image is removed */
  removed = output<void>();

  uploading = signal(false);
  error = signal('');
  dragging = signal(false);
  previewSrc = signal<string | null>(null);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  private processFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      this.error.set('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Image must be under 5MB');
      return;
    }

    this.error.set('');

    // Show local preview
    const reader = new FileReader();
    reader.onload = () => this.previewSrc.set(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    this.upload(file);
  }

  private upload(file: File): void {
    this.uploading.set(true);
    this.error.set('');

    const form = new FormData();
    form.append('file', file);
    form.append('folder', this.folder());

    this.http.post<{ success: boolean; data?: { url: string }; error?: string }>(
      '/api/v1/upload/image', form
    ).subscribe({
      next: (res) => {
        this.uploading.set(false);
        if (res.success && res.data?.url) {
          this.uploaded.emit(res.data.url);
        } else {
          this.error.set(res.error || 'Upload failed');
          this.previewSrc.set(null);
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.error || 'Upload failed');
        this.previewSrc.set(null);
      },
    });
  }

  removeImage(): void {
    const url = this.currentUrl();
    if (url) {
      // Delete from S3 in background
      this.http.delete('/api/v1/upload/image', { body: { url } }).subscribe();
    }
    this.previewSrc.set(null);
    this.removed.emit();
  }
}
