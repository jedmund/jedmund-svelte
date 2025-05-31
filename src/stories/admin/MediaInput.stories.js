import MediaInput from '$lib/components/admin/MediaInput.svelte';

// Mock Media objects for testing
const mockMedia = {
  id: '1',
  filename: 'example-image.jpg',
  originalName: 'example-image.jpg',
  mimeType: 'image/jpeg',
  size: 1024000,
  width: 1920,
  height: 1080,
  url: 'https://via.placeholder.com/300x200/0066cc/ffffff?text=Sample+Image',
  thumbnailUrl: 'https://via.placeholder.com/300x200/0066cc/ffffff?text=Sample+Image',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockMediaList = [
  mockMedia,
  {
    id: '2',
    filename: 'another-image.png',
    originalName: 'another-image.png',
    mimeType: 'image/png',
    size: 512000,
    width: 800,
    height: 600,
    url: 'https://via.placeholder.com/300x200/cc6600/ffffff?text=Image+2',
    thumbnailUrl: 'https://via.placeholder.com/300x200/cc6600/ffffff?text=Image+2',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    filename: 'third-image.jpg',
    originalName: 'third-image.jpg',
    mimeType: 'image/jpeg',
    size: 768000,
    width: 1200,
    height: 800,
    url: 'https://via.placeholder.com/300x200/009966/ffffff?text=Image+3',
    thumbnailUrl: 'https://via.placeholder.com/300x200/009966/ffffff?text=Image+3',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default {
  title: 'Admin/Form Components/MediaInput',
  component: MediaInput,
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: { type: 'select' },
      options: ['single', 'multiple']
    },
    fileType: {
      control: { type: 'select' },
      options: ['image', 'video', 'all']
    },
    required: {
      control: 'boolean'
    },
    label: {
      control: 'text'
    },
    placeholder: {
      control: 'text'
    },
    error: {
      control: 'text'
    }
  }
};

// Single media input (empty)
export const SingleEmpty = {
  args: {
    label: 'Featured Image',
    mode: 'single',
    fileType: 'image',
    placeholder: 'No image selected',
    value: null
  }
};

// Single media input (with value)
export const SingleWithValue = {
  args: {
    label: 'Featured Image',
    mode: 'single',
    fileType: 'image',
    value: mockMedia
  }
};

// Multiple media input (empty)
export const MultipleEmpty = {
  args: {
    label: 'Gallery Images',
    mode: 'multiple',
    fileType: 'image',
    placeholder: 'No images selected',
    value: []
  }
};

// Multiple media input (with values)
export const MultipleWithValues = {
  args: {
    label: 'Gallery Images',
    mode: 'multiple',
    fileType: 'image',
    value: mockMediaList
  }
};

// Required field
export const Required = {
  args: {
    label: 'Logo Image',
    mode: 'single',
    fileType: 'image',
    required: true,
    placeholder: 'Choose a logo image'
  }
};

// With error state
export const WithError = {
  args: {
    label: 'Profile Picture',
    mode: 'single',
    fileType: 'image',
    required: true,
    error: 'Please select a profile picture'
  }
};

// All file types
export const AllFileTypes = {
  args: {
    label: 'Any Media File',
    mode: 'single',
    fileType: 'all',
    placeholder: 'Choose any media file'
  }
};

// Video only
export const VideoOnly = {
  args: {
    label: 'Video File',
    mode: 'single',
    fileType: 'video',
    placeholder: 'Choose a video file'
  }
};

// Multiple with many files
export const MultipleWithManyFiles = {
  args: {
    label: 'Project Assets',
    mode: 'multiple',
    fileType: 'all',
    value: [
      ...mockMediaList,
      {
        id: '4',
        filename: 'video-file.mp4',
        originalName: 'video-file.mp4',
        mimeType: 'video/mp4',
        size: 5120000,
        width: null,
        height: null,
        url: 'https://via.placeholder.com/300x200/990066/ffffff?text=Video',
        thumbnailUrl: 'https://via.placeholder.com/300x200/990066/ffffff?text=Video',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '5',
        filename: 'document.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        width: null,
        height: null,
        url: 'https://via.placeholder.com/300x200/666666/ffffff?text=PDF',
        thumbnailUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
};

// Interactive playground
export const Playground = {
  args: {
    label: 'Media Input',
    mode: 'single',
    fileType: 'image',
    required: false,
    placeholder: 'Select a file'
  }
};