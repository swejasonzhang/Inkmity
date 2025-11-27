const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const validateFileUpload = (options = {}) => {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
    fieldName = "file",
  } = options;

  return (req, res, next) => {
    const file = req.file || req.files?.[fieldName];
    
    if (!file) {
      return next();
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        error: "File too large",
        message: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
        requestId: req.requestId,
      });
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: "Invalid file type",
        message: `File type ${file.mimetype} is not allowed`,
        allowedTypes,
        requestId: req.requestId,
      });
    }

    next();
  };
};

export const validateImageUpload = (options = {}) => {
  return validateFileUpload({
    ...options,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });
};

export const validateVideoUpload = (options = {}) => {
  return validateFileUpload({
    ...options,
    allowedTypes: ALLOWED_VIDEO_TYPES,
  });
};



