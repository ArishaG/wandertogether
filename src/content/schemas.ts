import { z } from 'zod';
export const schemas = {
  home: z.object({
    "hero": z.object({
      "heading": z.string(),
      "subheading": z.string(),
      "ctaPrimary": z.string(),
      "ctaSecondary": z.string()
    }),
    "tripTypes": z.object({
      "heading": z.string(),
      "local": z.object({
        "title": z.string(),
        "description": z.string(),
        "badge": z.string()
      }),
      "overseas": z.object({
        "title": z.string(),
        "description": z.string(),
        "badge": z.string()
      })
    }),
    "features": z.object({
      "heading": z.string(),
      "subheading": z.string(),
      "items": z.array(z.object({
        "id": z.string(),
        "title": z.string(),
        "description": z.string(),
        "size": z.string()
      }))
    }),
    "howItWorks": z.object({
      "heading": z.string(),
      "steps": z.array(z.object({
        "id": z.string(),
        "number": z.string(),
        "title": z.string(),
        "description": z.string()
      }))
    }),
    "cta": z.object({
      "heading": z.string(),
      "subheading": z.string(),
      "button": z.string()
    })
  }),
  dashboard: z.object({
    "trip": z.object({
      "name": z.string(),
      "emoji": z.string(),
      "dates": z.string(),
      "daysLeft": z.number(),
      "status": z.string(),
      "coverImage": z.string()
    }),
    "members": z.array(z.object({
      "id": z.string(),
      "name": z.string(),
      "initials": z.string(),
      "color": z.string(),
      "role": z.string(),
      "status": z.string()
    })),
    "locations": z.array(z.object({
      "id": z.string(),
      "name": z.string(),
      "category": z.string(),
      "description": z.string(),
      "safetyTag": z.string(),
      "accessibilityTag": z.string(),
      "votes": z.number(),
      "addedBy": z.string(),
      "estimatedCost": z.string(),
      "image": z.string()
    })),
    "notifications": z.array(z.object({
      "id": z.string(),
      "icon": z.string(),
      "text": z.string(),
      "time": z.string(),
      "unread": z.boolean()
    }))
  }),
  pages: {
    start_trip: z.object({
      "meta": z.object({
        "title": z.string(),
        "description": z.string()
      }),
      "onboarding": z.object({
        "eyebrow": z.string(),
        "skip": z.string(),
        "stepOne": z.object({
          "heading": z.string(),
          "description": z.string(),
          "tripNameLabel": z.string(),
          "defaultTripName": z.string(),
          "tripTypeLabel": z.string(),
          "types": z.array(z.object({
            "id": z.string(),
            "title": z.string(),
            "description": z.string()
          })),
          "continue": z.string(),
          "hint": z.string()
        }),
        "stepTwo": z.object({
          "heading": z.string(),
          "description": z.string(),
          "options": z.array(z.object({
            "id": z.string(),
            "label": z.string()
          })),
          "dietaryPlaceholder": z.string(),
          "privacy": z.string(),
          "back": z.string(),
          "continue": z.string()
        }),
        "stepThree": z.object({
          "heading": z.string(),
          "description": z.string(),
          "options": z.array(z.object({
            "id": z.string(),
            "label": z.string()
          })),
          "back": z.string(),
          "finish": z.string()
        })
      }),
      "whiteboard": z.object({
        "nav": z.object({
          "tripCreation": z.string(),
          "whiteboard": z.string(),
          "itinerary": z.string(),
          "status": z.string()
        }),
        "toolbar": z.object({
          "addWidget": z.string(),
          "map": z.string(),
          "vote": z.string(),
          "viewItinerary": z.string(),
          "share": z.string()
        }),
        "tip": z.string(),
        "itinerary": z.object({
          "eyebrow": z.string(),
          "days": z.array(z.object({
            "id": z.string(),
            "title": z.string(),
            "description": z.string()
          }))
        })
      })
    }),
    polls: z.object({
      "meta": z.object({
        "title": z.string(),
        "description": z.string()
      }),
      "header": z.object({
        "eyebrow": z.string(),
        "title": z.string(),
        "subtitle": z.string(),
        "newPoll": z.string()
      }),
      "stats": z.array(z.object({
        "label": z.string(),
        "value": z.string(),
        "id": z.string()
      })),
      "filters": z.object({
        "all": z.string(),
        "active": z.string(),
        "closed": z.string()
      }),
      "polls": z.array(z.object({
        "question": z.string(),
        "category": z.string(),
        "deadline": z.string(),
        "status": z.string(),
        "totalVotes": z.string(),
        "options": z.array(z.object({
          "name": z.string(),
          "detail": z.string(),
          "votes": z.string(),
          "percent": z.string(),
          "id": z.string()
        })),
        "id": z.string()
      })),
      "sidebar": z.object({
        "title": z.string(),
        "items": z.array(z.object({
          "title": z.string(),
          "description": z.string(),
          "id": z.string()
        })),
        "tip": z.string()
      })
    }),
    itinerary: z.object({
      "meta": z.object({
        "title": z.string(),
        "description": z.string()
      }),
      "header": z.object({
        "tripName": z.string(),
        "dates": z.string(),
        "travelers": z.string(),
        "nights": z.string(),
        "board": z.string(),
        "decisions": z.string(),
        "tags": z.array(z.object({
          "label": z.string(),
          "id": z.string()
        }))
      }),
      "cost": z.object({
        "title": z.string(),
        "filters": z.array(z.object({
          "label": z.string(),
          "id": z.string()
        })),
        "cards": z.array(z.object({
          "label": z.string(),
          "value": z.string(),
          "detail": z.string(),
          "id": z.string()
        }))
      }),
      "days": z.array(z.object({
        "date": z.string(),
        "items": z.array(z.object({
          "time": z.string(),
          "title": z.string(),
          "cost": z.string(),
          "status": z.string(),
          "id": z.string()
        })),
        "id": z.string()
      })),
      "footer": z.object({
        "title": z.string(),
        "description": z.string(),
        "button": z.string()
      })
    }),
    trips: z.object({
      "eyebrow": z.string(),
      "title": z.string(),
      "description": z.string(),
      "currentTitle": z.string(),
      "pastTitle": z.string(),
      "currentTrips": z.array(z.object({
        "name": z.string(),
        "dates": z.string(),
        "status": z.string(),
        "members": z.string(),
        "nextStep": z.string(),
        "route": z.string(),
        "id": z.string()
      })),
      "pastTrips": z.array(z.object({
        "name": z.string(),
        "dates": z.string(),
        "summary": z.string(),
        "members": z.string(),
        "id": z.string()
      }))
    })
  }
};
export type Schemas = typeof schemas;