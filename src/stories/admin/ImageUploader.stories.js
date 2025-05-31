import ImageUploader from '$lib/components/admin/ImageUploader.svelte';

// Mock Media object for testing
const mockMedia = {
  id: 1,
  filename: 'sample-image.jpg',
  originalName: 'sample-image.jpg',
  mimeType: 'image/jpeg',
  size: 1024000,
  width: 1920,
  height: 1080,
  url: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Sample+Image',
  thumbnailUrl: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Sample+Image',
  altText: 'A beautiful sample image',
  description: 'This is a sample image for testing purposes',
  createdAt: new Date(),
  updatedAt: new Date()
};

export default {
  title: 'Admin/Form Components/ImageUploader',
  component: ImageUploader,
  tags: ['autodocs'],
  argTypes: {
    aspectRatio: {
      control: { type: 'select' },
      options: ['', '1:1', '16:9', '4:3', '3:2']
    },
    required: {
      control: 'boolean'
    },
    allowAltText: {
      control: 'boolean'
    },
    showBrowseLibrary: {
      control: 'boolean'
    },
    maxFileSize: {
      control: 'number'
    },
    label: {
      control: 'text'
    },
    placeholder: {
      control: 'text'
    },
    helpText: {
      control: 'text'
    },
    error: {
      control: 'text'
    }
  }
};

// Empty uploader
export const Empty = {
  args: {
    label: 'Featured Image',
    placeholder: 'Drag and drop an image here, or click to browse',
    allowAltText: true,
    required: false,
    maxFileSize: 10
  }
};

// With uploaded image
export const WithImage = {
  args: {
    label: 'Project Logo',
    value: mockMedia,
    allowAltText: true,
    aspectRatio: '1:1'
  }
};

// Square aspect ratio
export const SquareAspectRatio = {
  args: {
    label: 'Square Logo',
    aspectRatio: '1:1',
    placeholder: 'Upload a square logo',
    allowAltText: true,
    required: true
  }
};

// Wide aspect ratio
export const WideAspectRatio = {
  args: {
    label: 'Hero Banner',
    aspectRatio: '16:9',
    placeholder: 'Upload a banner image',
    allowAltText: true,
    helpText: 'Recommended size: 1920x1080 pixels'
  }
};

// Required field
export const Required = {
  args: {
    label: 'Required Image',
    required: true,
    allowAltText: true,
    placeholder: 'This field is required'
  }
};

// With error
export const WithError = {
  args: {
    label: 'Image with Error',
    error: 'Please select a valid image file',
    allowAltText: true
  }
};

// With help text
export const WithHelpText = {
  args: {
    label: 'Profile Picture',
    helpText: 'Upload a clear photo of yourself. This will be displayed on your profile.',
    allowAltText: true,
    aspectRatio: '1:1',
    maxFileSize: 5
  }
};

// Without alt text
export const WithoutAltText = {
  args: {
    label: 'Decorative Image',
    allowAltText: false,
    placeholder: 'Upload a decorative image',
    helpText: 'This image is purely decorative and does not need alt text.'
  }
};

// With browse library option
export const WithBrowseLibrary = {
  args: {
    label: 'Featured Image',
    allowAltText: true,
    showBrowseLibrary: true,
    placeholder: 'Upload a new image or browse existing ones'
  }
};

// Small file size limit
export const SmallFileLimit = {
  args: {
    label: 'Small Image',
    maxFileSize: 1,
    allowAltText: true,
    helpText: 'Maximum file size: 1MB'
  }
};

// Interactive playground
export const Playground = {
  args: {
    label: 'Image Upload',
    placeholder: 'Drag and drop an image here',
    allowAltText: true,
    required: false,
    maxFileSize: 10,
    showBrowseLibrary: false
  }
};