import { z } from 'zod';
export const schemas = {
  pages: {
    home: z.object({
      "landing": z.object({
        "eyebrow": z.string(),
        "title": z.string(),
        "body": z.string(),
        "cta": z.string()
      }),
      "profile": z.object({
        "title": z.string(),
        "newTrip": z.string(),
        "emptyTitle": z.string(),
        "emptyBody": z.string()
      }),
      "whiteboard": z.object({
        "checklistTitle": z.string(),
        "checklist": z.array(z.object({
          "label": z.string(),
          "hint": z.string(),
          "id": z.string()
        })),
        "createItinerary": z.string()
      }),
      "itinerary": z.object({
        "title": z.string(),
        "back": z.string(),
        "emptyTitle": z.string()
      }),
      "onboarding": z.object({
        "step1": z.object({
          "title": z.string(),
          "body": z.string(),
          "inputLabel": z.string(),
          "inputPlaceholder": z.string(),
          "types": z.array(z.object({
            "label": z.string(),
            "description": z.string(),
            "id": z.string()
          })),
          "caption": z.string()
        }),
        "step2": z.object({
          "title": z.string(),
          "inputPlaceholder": z.string()
        }),
        "step3": z.object({
          "title": z.string(),
          "inputPlaceholder": z.string()
        })
      })
    }),
    profile: z.object({
      "title": z.string(),
      "description": z.string(),
      "newTrip": z.string(),
      "createdByYou": z.string(),
      "joinedTrip": z.string(),
      "destinationFallback": z.string(),
      "tripCode": z.string(),
      "emptyTitle": z.string(),
      "emptyBody": z.string()
    })
  }
};
export type Schemas = typeof schemas;