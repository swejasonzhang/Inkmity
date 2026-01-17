import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).refine(data => {
  if (data.page && (data.page < 1 || data.page > 1000)) {
    throw new Error('Page must be between 1 and 1000');
  }
  if (data.limit && (data.limit < 1 || data.limit > 100)) {
    throw new Error('Limit must be between 1 and 100');
  }
  return true;
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      throw new Error('Start date must be before end date');
    }
  }
  return true;
});

export const createConsultationSchema = z.object({
  body: z.object({
    artistId: objectIdSchema,
    startTime: z.string().datetime(),
    durationMinutes: z.number().int().min(30).max(480),
    notes: z.string().max(1000).optional(),
  }),
});

export const createTattooSessionSchema = z.object({
  body: z.object({
    projectId: objectIdSchema,
    startTime: z.string().datetime(),
    durationMinutes: z.number().int().min(60).max(480),
    priceCents: z.number().int().min(0),
    notes: z.string().max(1000).optional(),
  }),
});

export const cancelBookingSchema = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export const rescheduleBookingSchema = z.object({
  body: z.object({
    newStartTime: z.string().datetime(),
    reason: z.string().max(500).optional(),
  }),
});

export const submitIntakeFormSchema = z.object({
  body: z.object({
    responses: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    medicalConditions: z.string().max(1000).optional(),
    medications: z.string().max(1000).optional(),
    allergies: z.string().max(1000).optional(),
    consent: z.boolean().refine(val => val === true, 'Medical consent is required'),
  }),
});

export const createPaymentIntentSchema = z.object({
  body: z.object({
    bookingId: objectIdSchema,
    type: z.enum(['deposit', 'final']),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores').optional(),
    bio: z.string().max(500).optional(),
    handle: z.string().regex(/^@[a-zA-Z0-9_-]+$/, 'Handle must start with @ and contain only letters, numbers, hyphens, and underscores').optional(),
    avatar: z.string().url().optional(),
  }),
});

export const updateVisibilitySchema = z.object({
  body: z.object({
    visibility: z.enum(['online', 'away', 'invisible']),
  }),
});

export const updateAvailabilitySchema = z.object({
  body: z.object({
    timezone: z.string(),
    schedule: z.record(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']), z.array(z.object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    }))),
    slotMinutes: z.number().int().min(15).max(120),
    bufferMinutes: z.number().int().min(0).max(60).optional().default(0),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(2000).trim(),
    attachments: z.array(z.object({
      type: z.enum(['image', 'file']),
      url: z.string().url(),
      filename: z.string().max(255),
    })).max(5).optional(),
  }),
});

export function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id) {
      return next(new ValidationError(`${paramName} parameter is required`));
    }

    const result = objectIdSchema.safeParse(id);
    if (!result.success) {
      return next(new ValidationError(`Invalid ${paramName} format`));
    }

    next();
  };
}

export function sanitizeInput(fields = []) {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = req.body[field]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '') // Remove all HTML tags for now
          .trim();
      }
    });
    next();
  };
}